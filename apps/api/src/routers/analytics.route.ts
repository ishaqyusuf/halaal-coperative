import { getAnalyticsSummary } from "@halaalvest/db"
import { z } from "zod"

import { createTRPCRouter, staffProcedure } from "../lib.trpc"

const analyticsPeriodSchema = z.enum([
  "current_month",
  "last_3_months",
  "last_6_months",
  "last_12_months",
])

export const analyticsRouter = createTRPCRouter({
  // Cooperative-wide numbers; the proxy already keeps members off /analytics.
  summary: staffProcedure
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
