import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import {
  createDbRuntime,
  getTenantFinanceSetup,
  getTenantInitialMigrationState,
  listInitialMigrationMemberReview,
} from "@halaalvest/db"
import { FinanceChargeSettingsView } from "@/components/finance-charge-settings-view"
import type { Charge, ChargeVersion } from "@/components/tables/charges/columns"
import { loadChargeFilterParams } from "@/hooks/use-charge-filter-params"
import { loadChargeParams } from "@/hooks/use-charge-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { canShowQuickFill, getDashboardServerContext } from "@/lib/server-context"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  title: "Charges | Finance Settings",
}

const demoChargeDefinitions = [
  {
    chargeFrequency: "recurring_monthly" as const,
    chargeValueType: "fixed_amount" as const,
    code: "ADM",
    id: "charge-1",
    isActive: true,
    kind: "fixed",
    name: "Administrative fee",
    versions: [
      {
        amount: 1500,
        chargeValueType: "fixed_amount" as const,
        effectiveFrom: "2024-01-01",
        id: "charge-1-v1",
        notes: "Initial amount",
        status: "historical" as const,
      },
      {
        amount: 2000,
        chargeValueType: "fixed_amount" as const,
        effectiveFrom: "2025-02-01",
        id: "charge-1-v2",
        notes: "Updated amount",
        status: "current" as const,
      },
    ],
  },
  {
    chargeFrequency: "recurring_monthly" as const,
    chargeValueType: "fixed_amount" as const,
    code: "LEVY",
    id: "charge-2",
    isActive: true,
    kind: "fixed",
    name: "Monthly levy",
    versions: [
      {
        amount: 1000,
        chargeValueType: "fixed_amount" as const,
        effectiveFrom: "2024-01-01",
        id: "charge-2-v1",
        notes: "Default levy",
        status: "current" as const,
      },
    ],
  },
]

type ChargeSortField =
  | "chargeFrequency"
  | "chargeValueType"
  | "currentAmount"
  | "isActive"
  | "name"
  | "versionCount"

function getChargeSort(
  sort?: string[] | null
): [ChargeSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "chargeFrequency",
    "chargeValueType",
    "currentAmount",
    "isActive",
    "name",
    "versionCount",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as ChargeSortField, direction]
}

function withCurrentVersion(rows: Omit<Charge, "currentVersion">[]): Charge[] {
  return rows.map((row) => ({
    ...row,
    currentVersion:
      row.versions.find((version) => version.status === "current") ??
      row.versions.at(-1) ??
      null,
  }))
}

type RawChargeVersion = {
  amount: number | string
  chargeValueType?: "fixed_amount" | "percentage" | null
  effectiveFrom: Date
  id: string
  kind?: string | null
  notes?: string | null
}

type RawCharge = {
  appliesToLoanRequests?: boolean | null
  appliesToLoans?: boolean | null
  appliesToMembers?: boolean | null
  chargeFrequency?:
    | "recurring_monthly"
    | "per_contribution"
    | "one_time"
    | "manual"
    | null
  chargeValueType?: "fixed_amount" | "percentage" | null
  code: string
  id: string
  isActive: boolean
  kind: string
  name: string
  purpose?: "general" | "member_share" | "loan_fee" | "membership_fee" | "penalty" | null
  versions: RawChargeVersion[]
}

function mapChargeRows(rows: RawCharge[]): Charge[] {
  const today = new Date()

  return rows.map((charge) => {
    const currentVersion =
      [...charge.versions]
        .reverse()
        .find(
          (version) =>
            new Date(version.effectiveFrom).getTime() <= today.getTime()
        ) ?? null
    const versions = charge.versions.map(
      (version): ChargeVersion => ({
        amount: Number(version.amount),
        chargeValueType:
          version.chargeValueType ??
          (version.kind === "percentage" ? "percentage" : "fixed_amount"),
        effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
        id: version.id,
        notes: version.notes,
        status:
          currentVersion?.id === version.id
            ? "current"
            : new Date(version.effectiveFrom).getTime() > today.getTime()
              ? "scheduled"
              : "historical",
      })
    )

    return {
      appliesToLoanRequests: charge.appliesToLoanRequests ?? false,
      appliesToLoans: charge.appliesToLoans ?? false,
      appliesToMembers: charge.appliesToMembers ?? true,
      chargeFrequency: charge.chargeFrequency ?? "recurring_monthly",
      chargeValueType:
        charge.chargeValueType ??
        (charge.kind === "percentage" ? "percentage" : "fixed_amount"),
      code: charge.code,
      currentVersion:
        versions.find((version) => version.status === "current") ??
        versions.at(-1) ??
        null,
      id: charge.id,
      isActive: charge.isActive,
      kind: charge.kind,
      name: charge.name,
      purpose: charge.purpose ?? "general",
      versions,
    }
  })
}

export default function FinanceChargesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  return <FinanceChargesPageContent searchParams={searchParams} />
}

async function FinanceChargesPageContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filter = loadChargeFilterParams(resolvedSearchParams)
  loadChargeParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [context, initialChargeTableSettings] = await Promise.all([
    getDashboardServerContext(),
    getInitialTableSettings("charges"),
  ])
  const runtime = createDbRuntime()
  const quickFillEnabled = canShowQuickFill(context)

  let isLocked = false
  let rows = withCurrentVersion(demoChargeDefinitions)
  let financeStartDate = context.tenant?.startDate ?? "2024-01-01"
  let tenantName = context.tenant?.name ?? "Demo cooperative"
  const remoteRows =
    Boolean(context.tenant) && runtime.status === "database-configured"

  if (remoteRows && context.tenant) {
    const [data, migrationState, migrationMemberReview] = await Promise.all([
      getTenantFinanceSetup(context.tenant.id),
      getTenantInitialMigrationState(context.tenant.id),
      listInitialMigrationMemberReview(context.tenant.id),
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
    rows = mapChargeRows(data.chargeDefinitions)
  }

  if (remoteRows) {
    const chargeInput = {
      frequency: filter.frequency ?? undefined,
      q: filter.q ?? undefined,
      sort: getChargeSort(sort),
      status: filter.status ?? undefined,
      valueType: filter.valueType ?? undefined,
    }
    const chargeOptions = trpc.charges.financeCharges.infiniteQueryOptions(
      chargeInput,
      {
        getNextPageParam: ({ meta }) => meta?.cursor,
      }
    )
    const caller = await getServerCaller()
    const initialChargePage = await caller.charges.financeCharges(chargeInput)

    getQueryClient().setQueryData(chargeOptions.queryKey, {
      pageParams: [chargeOptions.initialPageParam],
      pages: [initialChargePage],
    })
  }

  return (
    <HydrateClient>
      <FinanceChargeSettingsView
        financeStartDate={financeStartDate}
        initialChargeTableSettings={initialChargeTableSettings}
        isLocked={isLocked}
        quickFillEnabled={quickFillEnabled}
        remoteRows={remoteRows}
        rows={rows}
        tenantName={tenantName}
      />
    </HydrateClient>
  )
}
