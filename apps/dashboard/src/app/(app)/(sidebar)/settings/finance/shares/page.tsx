import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import {
  createDbRuntime,
  getTenantFinanceSetup,
  getTenantInitialMigrationState,
  listInitialMigrationMemberReview,
  listMemberShareApplications,
  listMembers,
  type MemberShareApplicationRow,
  type TenantSharePolicySettings,
} from "@halaalvest/db"
import { ScrollableContent } from "@/components/dashboard"
import { SecondaryMenu } from "@/components/secondary-menu"
import { ShareSettingsModelWorkspace } from "@/components/share-model-workspace"
import type { Share } from "@/components/tables/shares/columns"
import { loadShareFilterParams } from "@/hooks/use-share-filter-params"
import { loadShareParams } from "@/hooks/use-share-params"
import { getDashboardServerContext } from "@/lib/server-context"

export const metadata: Metadata = {
  title: "Shares | Finance Settings",
}

const financeMenuItems = [
  { path: "/settings/finance", label: "Overview" },
  { path: "/settings/finance/shares", label: "Shares" },
  { path: "/settings/finance/charges", label: "Charges" },
  { path: "/settings/finance/business", label: "Business" },
  { path: "/settings/finance/loan", label: "Loan" },
  { path: "/settings/finance/migration", label: "Migration" },
]

const demoShareVersions = [
  {
    amount: 10000,
    basis: "after_charge_deductions" as const,
    effectiveFrom: "2024-01-01",
    id: "share-1",
    notes: "Initial cooperative default share",
    valueType: "fixed_amount" as const,
  },
  {
    amount: 10,
    basis: "after_charge_deductions" as const,
    effectiveFrom: "2025-01-01",
    id: "share-2",
    notes: "Changed to percentage after annual review",
    valueType: "percentage" as const,
  },
]

const demoSharePolicy = {
  configurationMode: "monthly_history" as const,
  compulsoryShareUnits: 1,
  id: null,
  maximumShareUnits: 20,
  unitAmount: 10000,
}

const demoMemberOptions = [
  { id: "member-1", label: "Aisha Bello (M-001)" },
  { id: "member-2", label: "Musa Ibrahim (M-002)" },
]

function toShareRows(
  rows: Array<{
    amount: number
    basis: "after_charge_deductions"
    effectiveFrom: string
    id: string
    notes?: string | null
    valueType: "fixed_amount" | "percentage"
  }>
): Share[] {
  return rows.map((row, index) => ({
    ...row,
    isCurrent: index === rows.length - 1,
  }))
}

type RawShareVersion = {
  amount: number | string
  basis?: "after_charge_deductions" | null
  effectiveFrom: Date
  id: string
  notes?: string | null
  valueType?: "fixed_amount" | "percentage" | null
}

export default function ShareSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  return <ShareSettingsPageContent searchParams={searchParams} />
}

async function ShareSettingsPageContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  loadShareFilterParams(resolvedSearchParams)
  loadShareParams(resolvedSearchParams)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  let isLocked = false
  let rows = toShareRows(demoShareVersions)
  let financeStartDate = context.tenant?.startDate ?? "2024-01-01"
  let memberOptions = demoMemberOptions
  let shareApplications: MemberShareApplicationRow[] = []
  let sharePolicy: TenantSharePolicySettings = demoSharePolicy
  let tenantName = context.tenant?.name ?? "Demo cooperative"

  if (context.tenant && runtime.status === "database-configured") {
    const [
      data,
      migrationState,
      migrationMemberReview,
      memberData,
      applications,
    ] = await Promise.all([
      getTenantFinanceSetup(context.tenant.id),
      getTenantInitialMigrationState(context.tenant.id),
      listInitialMigrationMemberReview(context.tenant.id),
      listMembers(context.tenant.id, { page: 1, pageSize: 200 }),
      listMemberShareApplications({ tenantId: context.tenant.id }),
    ])
    const hasAppliedMemberBackfill = migrationMemberReview.some(
      (member) =>
        member.status === "backfill_applied" ||
        member.appliedBackfillBatches > 0 ||
        member.appliedBackfillMonths > 0
    )

    isLocked =
      !migrationState.snapshot.canUseMigrationTools || hasAppliedMemberBackfill
    financeStartDate =
      data.tenant?.startDate?.toISOString().slice(0, 10) ?? null
    tenantName = data.tenant?.name ?? context.tenant.name
    memberOptions = memberData.items.map((member) => ({
      id: member.id,
      label: `${member.fullName} (${member.memberNumber})`,
    }))
    shareApplications = applications
    sharePolicy = data.sharePolicy
    rows = toShareRows(
      data.shareStructureVersions.map((version: RawShareVersion) => ({
        amount: Number(version.amount),
        basis: version.basis ?? "after_charge_deductions",
        effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
        id: version.id,
        notes: version.notes,
        valueType: version.valueType ?? "fixed_amount",
      }))
    )
  }
  return (
    <ScrollableContent>
      <div className="flex max-w-[800px] flex-col gap-6">
        <SecondaryMenu items={financeMenuItems} />

        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Finance settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Shares
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose the active share model for {tenantName}. Member share setup
            uses only the selected model.
          </p>
        </div>

        <ShareSettingsModelWorkspace
          applications={shareApplications}
          financeStartDate={financeStartDate}
          isLocked={isLocked}
          memberOptions={memberOptions}
          rows={rows}
          sharePolicy={sharePolicy}
        />
      </div>
    </ScrollableContent>
  )
}
