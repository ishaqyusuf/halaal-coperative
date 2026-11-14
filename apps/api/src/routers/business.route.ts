import {
  getBusinessDetail,
  getBusinessPageSummary,
  getCurrentBusinessProfitSeason,
  getProfitSeasonDetail,
  getTenantInitialMigrationState,
  getTenantMigrationWriteAccess,
  listBusinessRows,
  listProfitSeasons,
  listProfitSeasonShares,
} from "@halaalvest/db"
import { AppError } from "@halaalvest/errors"
import {
  businessIdSchema,
  listBusinessesSchema,
  listProfitSeasonSharesSchema,
  profitSeasonIdSchema,
} from "../schemas/business"
import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

/** Staff only: members never read other members' business or profit records. */
const businessProcedure = permissionProcedure("view_share_profit_governance")

/**
 * What the page needs to decide which buttons to show. Live cooperatives
 * read one tenant row; only cooperatives still setting up read the full
 * migration state (for the "no businesses to bring in" step).
 */
async function getBusinessSetup(tenantId: string) {
  const [access, currentProfitSeason] = await Promise.all([
    getTenantMigrationWriteAccess(tenantId),
    getCurrentBusinessProfitSeason(tenantId),
  ])

  if (access.canUseLiveFinancialWrites) {
    return { canReviewNoProfit: false, currentProfitSeason, isLocked: false }
  }

  const [migrationState, firstBusiness] = await Promise.all([
    getTenantInitialMigrationState(tenantId),
    listBusinessRows(tenantId, { pageSize: 1 }),
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

  return {
    canReviewNoProfit:
      !businessProfitPoolsReviewed &&
      firstBusiness.data.length === 0 &&
      !isHistoricalSetupLocked,
    currentProfitSeason,
    isLocked: !(
      migrationState.snapshot.status === "finalized" ||
      (migrationState.snapshot.canUseMigrationTools && !hasAppliedMemberBackfill)
    ),
  }
}

export const businessRouter = createTRPCRouter({
  get: businessProcedure.input(businessIdSchema).query(async ({ ctx, input }) => {
    const business = await getBusinessDetail({
      businessId: input.businessId,
      tenantId: ctx.tenant.current.id,
    })

    if (!business) {
      throw new AppError({
        code: "NOT_FOUND",
        operation: "business.get",
        publicMessage: "Business not found.",
      })
    }

    return business
  }),

  list: businessProcedure
    .input(listBusinessesSchema)
    .query(({ ctx, input }) =>
      listBusinessRows(ctx.tenant.current.id, input ?? {})
    ),

  season: businessProcedure
    .input(profitSeasonIdSchema)
    .query(async ({ ctx, input }) => {
      const season = await getProfitSeasonDetail({
        seasonId: input.seasonId,
        tenantId: ctx.tenant.current.id,
      })

      if (!season) {
        throw new AppError({
          code: "NOT_FOUND",
          operation: "business.season",
          publicMessage: "Season not found.",
        })
      }

      return season
    }),

  seasonShares: businessProcedure
    .input(listProfitSeasonSharesSchema)
    .query(({ ctx, input }) =>
      listProfitSeasonShares({ ...input, tenantId: ctx.tenant.current.id })
    ),

  seasons: businessProcedure.query(({ ctx }) =>
    listProfitSeasons(ctx.tenant.current.id)
  ),

  setup: businessProcedure.query(({ ctx }) =>
    getBusinessSetup(ctx.tenant.current.id)
  ),

  summary: businessProcedure.query(({ ctx }) =>
    getBusinessPageSummary(ctx.tenant.current.id)
  ),
})
