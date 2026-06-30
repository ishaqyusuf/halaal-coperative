import { getOverviewSummary } from "@halaalvest/db"

import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

export const overviewRouter = createTRPCRouter({
  summary: tenantProcedure.query(({ ctx }) => {
    return getOverviewSummary(ctx.tenant.current.id)
  }),
})
