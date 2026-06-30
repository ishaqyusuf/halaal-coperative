import { getAnalyticsSummary } from "@halaalvest/db"
import { z } from "zod"

import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

const analyticsPeriodSchema = z.enum([
  "current_month",
  "last_3_months",
  "last_6_months",
  "last_12_months",
])

export const analyticsRouter = createTRPCRouter({
  summary: tenantProcedure
    .input(
      z
        .object({
          period: analyticsPeriodSchema.optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) => {
      return getAnalyticsSummary({
        period: input?.period,
        tenantId: ctx.tenant.current.id,
      })
    }),
})
