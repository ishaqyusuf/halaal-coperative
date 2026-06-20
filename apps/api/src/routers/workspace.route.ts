import { buildDashboardSnapshot, defaultTenantPolicy } from "@halaalvest/domain"
import { getDashboardMetrics } from "@halaalvest/db"

import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

export const workspaceRouter = createTRPCRouter({
  summary: tenantProcedure.query(async ({ ctx }) => {
    const tenant = ctx.tenant.current

    let dashboard
    if (ctx.runtime.status === "database-configured") {
      const metrics = await getDashboardMetrics(tenant.id)
      dashboard = buildDashboardSnapshot({
        tenant,
        policy: { reserveBuffer: metrics.reserveBuffer },
        metrics: {
          activeLoans: metrics.activeLoanCount,
          availablePool: metrics.availablePool,
          delinquencyRate: metrics.delinquencyRate,
          monthlyContributionTarget: metrics.totalContributions,
          collectionCoverage: metrics.activeMemberCount > 0 ? metrics.activeMemberCount / metrics.memberCount : 0,
        },
      })
    } else {
      dashboard = buildDashboardSnapshot({
        tenant,
        policy: { reserveBuffer: defaultTenantPolicy.reserveBuffer },
      })
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      dashboard,
      loanPolicy: defaultTenantPolicy,
      resolvedBy: ctx.request.tenantResolution.resolvedBy,
    }
  }),
})
