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
import { FinanceShareSettingsView } from "@/components/finance-share-settings-view"
import type { Share } from "@/components/tables/shares/columns"
import { loadShareApplicationFilterParams } from "@/hooks/use-share-application-filter-params"
import { loadShareFilterParams } from "@/hooks/use-share-filter-params"
import { loadShareParams } from "@/hooks/use-share-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  title: "Shares | Finance Settings",
}

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

type ShareSortField =
  | "amount"
  | "effectiveFrom"
  | "isCurrent"
  | "notes"
  | "valueType"

type ShareApplicationSortField =
  | "createdAt"
  | "memberName"
  | "requestedUnits"
  | "reviewedAt"
  | "shareValueSnapshot"
  | "status"

type ShareApplicationStatus =
  | "approved"
  | "cancelled"
  | "pending"
  | "rejected"

function getShareSort(
  sort?: string[] | null
): [ShareSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "amount",
    "effectiveFrom",
    "isCurrent",
    "notes",
    "valueType",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as ShareSortField, direction]
}

function getShareApplicationSort(
  sort?: string[] | null
): [ShareApplicationSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const fieldMap: Record<string, ShareApplicationSortField> = {
    application: "memberName",
    createdAt: "createdAt",
    memberName: "memberName",
    requestedAt: "createdAt",
    requestedUnits: "requestedUnits",
    reviewedAt: "reviewedAt",
    shareValueSnapshot: "shareValueSnapshot",
    status: "status",
    units: "requestedUnits",
    value: "shareValueSnapshot",
  }
  const sortField = fieldMap[field]

  if (!sortField) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [sortField, direction]
}

function getShareApplicationStatus(
  value: string | null
): ShareApplicationStatus | undefined {
  const validStatuses = new Set<ShareApplicationStatus>([
    "approved",
    "cancelled",
    "pending",
    "rejected",
  ])

  return validStatuses.has(value as ShareApplicationStatus)
    ? (value as ShareApplicationStatus)
    : undefined
}

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
  const filter = loadShareFilterParams(resolvedSearchParams)
  const shareApplicationFilter = loadShareApplicationFilterParams(
    resolvedSearchParams
  )
  loadShareParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [
    context,
    initialShareTableSettings,
    initialShareApplicationTableSettings,
  ] = await Promise.all([
    getDashboardServerContext(),
    getInitialTableSettings("shares"),
    getInitialTableSettings("shareApplications"),
  ])
  const runtime = createDbRuntime()

  let isLocked = false
  let rows = toShareRows(demoShareVersions)
  let financeStartDate = context.tenant?.startDate ?? "2024-01-01"
  let memberOptions = demoMemberOptions
  let shareApplications: MemberShareApplicationRow[] = []
  let sharePolicy: TenantSharePolicySettings = demoSharePolicy
  let tenantName = context.tenant?.name ?? "Demo cooperative"
  const remoteRows =
    Boolean(context.tenant) && runtime.status === "database-configured"

  if (remoteRows && context.tenant) {
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

  if (remoteRows) {
    const shareInput = {
      effectiveFrom: filter.effectiveFrom ?? undefined,
      effectiveTo: filter.effectiveTo ?? undefined,
      q: filter.q ?? undefined,
      sort: getShareSort(sort),
      status: filter.status ?? undefined,
      valueType: filter.valueType ?? undefined,
    }
    const shareApplicationInput = {
      q: shareApplicationFilter.shareApplicationQ ?? undefined,
      sort: getShareApplicationSort(sort),
      status: getShareApplicationStatus(
        shareApplicationFilter.shareApplicationStatus
      ),
    }
    const shareOptions = trpc.charges.financeShares.infiniteQueryOptions(
      shareInput,
      {
        getNextPageParam: ({ meta }) => meta?.cursor,
      }
    )
    const shareApplicationOptions =
      trpc.shareApplications.list.infiniteQueryOptions(
        shareApplicationInput,
        {
          getNextPageParam: ({ meta }) => meta?.cursor,
        }
      )
    const caller = await getServerCaller()
    const [initialSharePage, initialShareApplicationPage] = await Promise.all([
      caller.charges.financeShares(shareInput),
      caller.shareApplications.list(shareApplicationInput),
    ])

    getQueryClient().setQueryData(shareOptions.queryKey, {
      pageParams: [shareOptions.initialPageParam],
      pages: [initialSharePage],
    })
    getQueryClient().setQueryData(shareApplicationOptions.queryKey, {
      pageParams: [shareApplicationOptions.initialPageParam],
      pages: [initialShareApplicationPage],
    })
  }

  return (
    <HydrateClient>
      <FinanceShareSettingsView
        financeStartDate={financeStartDate}
        initialShareTableSettings={initialShareTableSettings}
        initialShareApplicationTableSettings={
          initialShareApplicationTableSettings
        }
        isLocked={isLocked}
        memberOptions={memberOptions}
        remoteRows={remoteRows}
        rows={rows}
        shareApplications={shareApplications}
        sharePolicy={sharePolicy}
        tenantName={tenantName}
      />
    </HydrateClient>
  )
}
