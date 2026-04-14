import { createNotificationFromType, platformNotificationTypes } from "@halaal-vest/notifications"

import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

export const notificationsRouter = createTRPCRouter({
  list: tenantProcedure.query(({ ctx }) => {
    return [
      createNotificationFromType(platformNotificationTypes, "workspace_invitation", {
        recipientName: "Finance Officer",
        tenantName: ctx.tenant.current.name,
      }),
      createNotificationFromType(platformNotificationTypes, "loan_approval_required", {
        amount: 250000,
        memberName: "Amina Yusuf",
      }),
    ]
  }),
})
