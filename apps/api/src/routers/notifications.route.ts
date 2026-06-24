import { createHalaalVestNotificationFromType } from "@halaalvest/notifications"

import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

export const notificationsRouter = createTRPCRouter({
  list: tenantProcedure.query(({ ctx }) => {
    return [
      createHalaalVestNotificationFromType("member.status_changed", {
        memberId: "sample-member",
        memberName: "Amina Yusuf",
        status: "active",
        tenantName: ctx.tenant.current.name,
      }),
      createHalaalVestNotificationFromType("loan.request_status_changed", {
        amount: 250000,
        loanRequestId: "sample-loan-request",
        memberName: "Amina Yusuf",
        status: "under_review",
        tenantName: ctx.tenant.current.name,
      }),
    ]
  }),
})
