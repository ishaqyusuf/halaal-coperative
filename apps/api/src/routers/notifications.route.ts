import { createNotificationFromType, platformNotificationTypes } from "@amanah/notifications"

import { createTRPCRouter, tenantProcedure } from "../lib.trpc.js"

export const notificationsRouter = createTRPCRouter({
  list: tenantProcedure.query(({ ctx }) => {
    return [
      createNotificationFromType(platformNotificationTypes, "workspace_invitation", {
        recipientName: "Finance Officer",
        tenantName: ctx.auth.activeTenantId ?? "tenant",
      }),
      createNotificationFromType(platformNotificationTypes, "loan_approval_required", {
        amount: 250000,
        memberName: "Amina Yusuf",
      }),
    ]
  }),
})
