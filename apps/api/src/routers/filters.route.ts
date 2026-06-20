import {
  getAuditFilterMetadata,
  getContributionFilterMetadata,
  getMemberFilterMetadata,
  getMembershipApprovalFilterMetadata,
  getNotificationFilterMetadata,
  getRepaymentFilterMetadata,
  getReportsFilterMetadata,
} from "@halaalvest/db"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

export const filtersRouter = createTRPCRouter({
  audit: tenantProcedure.query(({ ctx }) => {
    return getAuditFilterMetadata(ctx.tenant.current.id)
  }),
  contributions: tenantProcedure.query(({ ctx }) => {
    return getContributionFilterMetadata(ctx.tenant.current.id)
  }),
  members: tenantProcedure.query(() => {
    return getMemberFilterMetadata()
  }),
  membershipApprovals: tenantProcedure.query(() => {
    return getMembershipApprovalFilterMetadata()
  }),
  notifications: tenantProcedure.query(({ ctx }) => {
    return getNotificationFilterMetadata(ctx.tenant.current.id)
  }),
  repayments: tenantProcedure.query(({ ctx }) => {
    return getRepaymentFilterMetadata(ctx.tenant.current.id)
  }),
  reports: tenantProcedure.query(() => {
    return getReportsFilterMetadata()
  }),
})
