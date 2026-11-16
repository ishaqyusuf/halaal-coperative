import { getOverviewSummary } from "@halaalvest/db"

import { createTRPCRouter, staffProcedure } from "../lib.trpc"

export const overviewRouter = createTRPCRouter({
  // Cooperative-wide numbers: members get their own home view instead.
  summary: staffProcedure.query(({ ctx }) => {
    const tenantId = ctx.tenant.current.id

    // In a dashboard render the layout already read the operation profile.
    return getOverviewSummary(tenantId, undefined, {
      operationProfile: ctx.lookups?.getTenantOperationProfile?.(tenantId),
    })
  }),
})
