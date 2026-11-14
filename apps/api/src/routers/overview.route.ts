import { getOverviewSummary } from "@halaalvest/db"

import { createTRPCRouter, staffProcedure } from "../lib.trpc"

export const overviewRouter = createTRPCRouter({
  // Cooperative-wide numbers: members get their own home view instead.
  summary: staffProcedure.query(({ ctx }) => {
    return getOverviewSummary(ctx.tenant.current.id)
  }),
})
