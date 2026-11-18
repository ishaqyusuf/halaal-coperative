import {
  getMobileNotificationCenter,
  getMobileNotificationPage,
  markAllMobileNotificationsRead,
} from "@halaalvest/db"
import { z } from "zod"
import { tenantProcedure } from "../lib.trpc"

const inbox = tenantProcedure.use(({ ctx, next }) =>
  next({
    ctx: {
      notificationInbox: {
        mobileDeviceSessionId: ctx.auth.session.mobileDeviceSessionId,
        role: ctx.auth.activeMembership.role,
        tenantId: ctx.tenant.current.id,
        userEmail: ctx.auth.session.user.email,
        userId: ctx.auth.session.user.id,
      },
    },
  })
)

export const mobileNotificationInboxProcedures = {
  inbox: inbox.query(({ ctx }) =>
    getMobileNotificationCenter({ ...ctx.notificationInbox, scopedPage: true })
  ),
  page: inbox
    .input(
      z.object({
        cursor: z.string().uuid().optional(),
        unreadOnly: z.boolean(),
      })
    )
    .query(({ ctx, input }) =>
      getMobileNotificationPage({ ...ctx.notificationInbox, ...input })
    ),
  markAllRead: inbox.mutation(({ ctx }) =>
    markAllMobileNotificationsRead(ctx.notificationInbox)
  ),
}
