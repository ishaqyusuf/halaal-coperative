import {
  getShareBusinessById,
  getTenantFinanceSetup,
  getTenantInitialMigrationState,
  listShareBusinessesForTableSummary,
  listShareBusinessesTable,
} from "@halaalvest/db"
import { z } from "zod"
import { listBusinessesSchema } from "../schemas/business"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

function toDividendPeriodOptions(
  periods: Array<{ id: string; name: string; status: string }>
) {
  return periods.map((period) => ({
    id: period.id,
    label: `${period.name} - ${period.status}`,
    name: period.name,
    status: period.status,
  }))
}

function getBusinessSummary(
  rows: Awaited<ReturnType<typeof listShareBusinessesTable>>["data"],
  periods: Array<{ label: string }>
) {
  const profitEntries = rows.flatMap((row) => row.profitEntries ?? [])
  const activeCapital = rows
    .filter((row) => row.status === "active")
    .reduce((total, row) => total + row.capitalAmount, 0)
  const reviewedProfit = profitEntries
    .filter((entry) => entry.status === "reviewed" || entry.status === "approved")
    .reduce((total, entry) => total + entry.allocatableProfitAmount, 0)
  const allocatableProfit = profitEntries.reduce(
    (total, entry) =>
      total +
      Math.max(entry.allocatableProfitAmount - entry.allocatedProfitAmount, 0),
    0
  )
  const pendingAllocationCount = profitEntries.filter(
    (entry) =>
      (entry.status === "reviewed" || entry.status === "approved") &&
      (entry.allocations?.length ?? 0) === 0
  ).length
  const blockedCount =
    rows.filter((row) => (row.profitEntries ?? []).length === 0).length +
    profitEntries.filter((entry) => entry.status === "draft").length

  return {
    activeCapital,
    allocatableProfit,
    blockedCount,
    pendingAllocationCount,
    publishedDistributionCount: periods.filter((period) =>
      period.label.toLowerCase().includes("published")
    ).length,
    reviewedProfit,
  }
}

async function getBusinessSetup(tenantId: string) {
  const [data, migrationState, firstPage] = await Promise.all([
    getTenantFinanceSetup(tenantId),
    getTenantInitialMigrationState(tenantId),
    listShareBusinessesTable(tenantId, { pageSize: 1 }),
  ])
  const hasAppliedMemberBackfill =
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  const businessProfitPoolsReviewed =
    migrationState.snapshot.steps.find(
      (step) => step.key === "business_profit_pools"
    )?.complete ?? false
  const isHistoricalSetupLocked =
    !migrationState.snapshot.canUseMigrationTools || hasAppliedMemberBackfill
  const isLocked = !(
    migrationState.snapshot.canUseLiveFinancialWrites ||
    migrationState.snapshot.status === "finalized" ||
    (migrationState.snapshot.canUseMigrationTools && !hasAppliedMemberBackfill)
  )
  const dividendPeriods = toDividendPeriodOptions(data.dividendPeriods)

  return {
    canReviewNoProfit:
      !businessProfitPoolsReviewed &&
      firstPage.data.length === 0 &&
      !isHistoricalSetupLocked,
    dividendPeriods,
    financeStartDate:
      data.tenant?.startDate?.toISOString().slice(0, 10) ?? null,
    isLocked,
  }
}

export const businessRouter = createTRPCRouter({
  get: tenantProcedure
    .input(z.object({ businessId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const business = await getShareBusinessById(
        ctx.tenant.current.id,
        input.businessId
      )

      if (!business) {
        throw new Error("Business not found")
      }

      return business
    }),

  list: tenantProcedure
    .input(listBusinessesSchema)
    .query(async ({ ctx, input }) => {
      return listShareBusinessesTable(ctx.tenant.current.id, input ?? {})
    }),

  setup: tenantProcedure.query(({ ctx }) => {
    return getBusinessSetup(ctx.tenant.current.id)
  }),

  summary: tenantProcedure.query(async ({ ctx }) => {
    const [financeSetup, businesses] = await Promise.all([
      getTenantFinanceSetup(ctx.tenant.current.id),
      listShareBusinessesForTableSummary(ctx.tenant.current.id),
    ])
    const dividendPeriods = toDividendPeriodOptions(financeSetup.dividendPeriods)

    return getBusinessSummary(businesses, dividendPeriods)
  }),
})
