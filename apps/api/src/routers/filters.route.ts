import {
  getAuditFilterMetadata,
  getContributionFilterMetadata,
  getMemberFilterMetadata,
  getMembershipApprovalFilterMetadata,
  getRepaymentFilterMetadata,
  getReportsFilterMetadata,
} from "@halaalvest/db"
import {
  createTRPCRouter,
  minRoleProcedure,
  staffProcedure,
  tenantProcedure,
} from "../lib.trpc"

export const filtersRouter = createTRPCRouter({
  // Static plain areas; no tenant data, so no role check is needed.
  audit: tenantProcedure.query(() => getAuditFilterMetadata()),
  // Lists up to 100 member names: the contributions page's staff roles only.
  contributions: staffProcedure.query(({ ctx }) => {
    return getContributionFilterMetadata(ctx.tenant.current.id)
  }),
  members: tenantProcedure.query(() => {
    return getMemberFilterMetadata()
  }),
  membershipApprovals: tenantProcedure.query(() => {
    return getMembershipApprovalFilterMetadata()
  }),
  // Lists borrowers and staff: the repayments page's own finance roles only.
  repayments: minRoleProcedure("finance_officer").query(({ ctx }) => {
    return getRepaymentFilterMetadata(ctx.tenant.current.id)
  }),
  reports: tenantProcedure.query(() => {
    return getReportsFilterMetadata()
  }),
})
