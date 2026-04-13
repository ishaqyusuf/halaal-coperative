import { sampleDashboardSnapshot, sampleLoanPolicy } from "@amanah/domain"

import { createTRPCRouter, tenantProcedure } from "../lib.trpc.js"

export const workspaceRouter = createTRPCRouter({
  summary: tenantProcedure.query(({ ctx }) => {
    return {
      tenantId: ctx.auth.activeTenantId,
      tenantName: sampleDashboardSnapshot.tenantName,
      dashboard: sampleDashboardSnapshot,
      loanPolicy: sampleLoanPolicy,
    }
  }),
})
