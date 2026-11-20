import {
  getBusinessDetail,
  getBusinessPageSummary,
  getBusinessSetup,
  getProfitSeasonDetail,
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
