import {
  createDbRuntime,
  getTenantFinanceSetup,
  getTenantInitialMigrationState,
  listInitialMigrationMemberReview,
} from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"

type DividendPeriodOption = {
  id: string
  label: string
}

type BusinessProfitEntry = {
  allocatedProfitAmount: number
  allocationCount: number
  allocatableProfitAmount: number
  expenseAmount: number
  hasPublishedAllocations: boolean
  id: string
  linkedDividendPeriod?: RawLinkedDividendPeriod | null
  notes?: string | null
  profitAmount: number
  profitDate: string
  reason?: string | null
  sourceType: string
  status: string
}

type Business = {
  capitalAmount: number
  endDate: string | null
  id: string
  linkedDividendPeriod?: RawLinkedDividendPeriod | null
  name: string
  notes?: string | null
  profitAmount: number
  profitEntries: BusinessProfitEntry[]
  startDate: string
  status: string
}

type RawLinkedDividendPeriod = {
  id: string
  name: string
  status: string
}

type RawBusinessProfitAllocation = {
  allocatedProfitAmount: number | string
  status: string
}

type RawBusinessProfitEntry = {
  allocatableProfitAmount?: number | string | null
  allocations?: RawBusinessProfitAllocation[] | null
  expenseAmount?: number | string | null
  id: string
  linkedDividendPeriod?: RawLinkedDividendPeriod | null
  notes?: string | null
  profitAmount: number | string
  profitDate: Date
  reason?: string | null
  sourceType: string
  status?: string | null
}

type RawBusiness = {
  capitalAmount: number | string
  endDate?: Date | null
  id: string
  linkedDividendPeriod?: RawLinkedDividendPeriod | null
  name: string
  notes?: string | null
  profitAmount: number | string
  profitEntries?: RawBusinessProfitEntry[] | null
  startDate: Date
  status: string
}

type RawDividendPeriod = {
  id: string
  name: string
  status: string
}

type BusinessPageSummary = {
  activeCapital: number
  allocatableProfit: number
  blockedCount: number
  pendingAllocationCount: number
  publishedDistributionCount: number
  reviewedProfit: number
}

export type BusinessPageData =
  | {
      state: "unavailable"
    }
  | {
      canReviewNoProfit: boolean
      dividendPeriods: DividendPeriodOption[]
      financeStartDate: string | null
      isLocked: boolean
      rows: Business[]
      state: "ready"
      summary: BusinessPageSummary
    }

function mapBusinessRows(rows: RawBusiness[]): Business[] {
  return rows.map((business) => ({
    capitalAmount: Number(business.capitalAmount),
    endDate: business.endDate
      ? business.endDate.toISOString().slice(0, 10)
      : null,
    id: business.id,
    linkedDividendPeriod: business.linkedDividendPeriod
      ? {
          id: business.linkedDividendPeriod.id,
          name: business.linkedDividendPeriod.name,
          status: business.linkedDividendPeriod.status,
        }
      : null,
    name: business.name,
    notes: business.notes,
    profitAmount: Number(business.profitAmount),
    profitEntries: (business.profitEntries ?? []).map((entry) => ({
      allocatedProfitAmount: (entry.allocations ?? []).reduce(
        (sum: number, allocation) =>
          sum + Number(allocation.allocatedProfitAmount),
        0,
      ),
      allocationCount: entry.allocations?.length ?? 0,
      allocatableProfitAmount: Number(
        entry.allocatableProfitAmount ?? entry.profitAmount,
      ),
      expenseAmount: Number(entry.expenseAmount ?? 0),
      hasPublishedAllocations: (entry.allocations ?? []).some(
        (allocation) => allocation.status === "published",
      ),
      id: entry.id,
      linkedDividendPeriod: entry.linkedDividendPeriod
        ? {
            id: entry.linkedDividendPeriod.id,
            name: entry.linkedDividendPeriod.name,
            status: entry.linkedDividendPeriod.status,
          }
        : null,
      notes: entry.notes,
      profitAmount: Number(entry.profitAmount),
      profitDate: entry.profitDate.toISOString().slice(0, 10),
      reason: entry.reason,
      sourceType: entry.sourceType,
      status: entry.status ?? "draft",
    })),
    startDate: business.startDate.toISOString().slice(0, 10),
    status: business.status,
  }))
}

function getBusinessSummary(
  rows: Business[],
  periods: DividendPeriodOption[],
): BusinessPageSummary {
  const profitEntries = rows.flatMap((row) => row.profitEntries)
  const activeCapital = rows
    .filter((row) => row.status === "active")
    .reduce((total, row) => total + row.capitalAmount, 0)
  const reviewedProfit = profitEntries
    .filter(
      (entry) => entry.status === "reviewed" || entry.status === "approved",
    )
    .reduce((total, entry) => total + entry.allocatableProfitAmount, 0)
  const allocatableProfit = profitEntries.reduce(
    (total, entry) =>
      total +
      Math.max(entry.allocatableProfitAmount - entry.allocatedProfitAmount, 0),
    0,
  )
  const pendingAllocationCount = profitEntries.filter(
    (entry) =>
      (entry.status === "reviewed" || entry.status === "approved") &&
      entry.allocationCount === 0,
  ).length
  const blockedCount =
    rows.filter((row) => row.profitEntries.length === 0).length +
    profitEntries.filter((entry) => entry.status === "draft").length

  return {
    activeCapital,
    allocatableProfit,
    blockedCount,
    pendingAllocationCount,
    publishedDistributionCount: periods.filter((period) =>
      period.label.toLowerCase().includes("published"),
    ).length,
    reviewedProfit,
  }
}

export async function loadBusinessPageData(): Promise<BusinessPageData> {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return { state: "unavailable" }
  }

  const [data, migrationState, migrationMemberReview] = await Promise.all([
    getTenantFinanceSetup(context.tenant.id),
    getTenantInitialMigrationState(context.tenant.id),
    listInitialMigrationMemberReview(context.tenant.id),
  ])
  const rows = mapBusinessRows(data.shareBusinesses)
  const hasAppliedMemberBackfill = migrationMemberReview.some(
    (member) =>
      member.status === "backfill_applied" ||
      member.appliedBackfillBatches > 0 ||
      member.appliedBackfillMonths > 0,
  )
  const businessProfitPoolsReviewed =
    migrationState.snapshot.steps.find(
      (step) => step.key === "business_profit_pools",
    )?.complete ?? false
  const isHistoricalSetupLocked =
    !migrationState.snapshot.canUseMigrationTools || hasAppliedMemberBackfill
  const isBusinessActionLocked = !(
    migrationState.snapshot.canUseLiveFinancialWrites ||
    migrationState.snapshot.status === "finalized" ||
    (migrationState.snapshot.canUseMigrationTools && !hasAppliedMemberBackfill)
  )
  const dividendPeriods = data.dividendPeriods.map(
    (period: RawDividendPeriod) => ({
      id: period.id,
      label: `${period.name} - ${period.status}`,
    }),
  )

  return {
    state: "ready",
    canReviewNoProfit:
      !businessProfitPoolsReviewed &&
      rows.length === 0 &&
      !isHistoricalSetupLocked,
    dividendPeriods,
    financeStartDate:
      data.tenant?.startDate?.toISOString().slice(0, 10) ?? null,
    isLocked: isBusinessActionLocked,
    rows,
    summary: getBusinessSummary(rows, dividendPeriods),
  }
}
