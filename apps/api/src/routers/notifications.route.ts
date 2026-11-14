import {
  countNotificationDeliveriesByStatus,
  listNotificationDeliveries,
  listStaffNotificationSettings,
  upsertNotificationPreference,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"

import { createTRPCRouter, tenantProcedure } from "../lib.trpc"
import {
  staffEmailRoleList,
  staffEmailRoles,
  workspaceSettingsRoles,
} from "../lib/staff-email-settings"
import {
  listNotificationDeliveriesSchema,
  setStaffEmailSettingSchema,
} from "../schemas/notifications"

type NotificationsContext = {
  auth: {
    activeMembership: { role: string }
    session: { user: { email: string } }
  }
}

// Staff see every email the cooperative sent. A member sees only the emails
// sent to them, because the log holds other people's addresses.
function getRecipientScope(ctx: NotificationsContext) {
  return ctx.auth.activeMembership.role === "member"
    ? ctx.auth.session.user.email
    : null
}

function assertCanManageEmailSettings(ctx: NotificationsContext) {
  if (
    !workspaceSettingsRoles.includes(
      ctx.auth.activeMembership.role as (typeof workspaceSettingsRoles)[number]
    )
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only a cooperative admin can change email settings.",
    })
  }
}

export const notificationsRouter = createTRPCRouter({
  deliveryHistory: tenantProcedure
    .input(listNotificationDeliveriesSchema)
    .query(async ({ ctx, input }) => {
      const page = await listNotificationDeliveries(ctx.tenant.current.id, {
        cursor: input?.cursor,
        pageSize: input?.pageSize ?? 25,
        recipient: getRecipientScope(ctx),
        search: input?.q,
        status: input?.status,
        type: input?.type,
      })

      return {
        data: page.data,
        meta: { cursor: page.nextCursor ?? undefined },
      }
    }),

  /** Sent, waiting and failed totals over every page, in one read. */
  summary: tenantProcedure.query(({ ctx }) => {
    return countNotificationDeliveriesByStatus(ctx.tenant.current.id, {
      recipient: getRecipientScope(ctx),
    })
  }),

  staffEmailSettings: tenantProcedure.query(({ ctx }) => {
    assertCanManageEmailSettings(ctx)

    return listStaffNotificationSettings(ctx.tenant.current.id, {
      notificationTypes: Object.keys(staffEmailRoles),
      roles: staffEmailRoleList,
    }).then((settings) =>
      settings.map((setting) => ({
        notificationType: setting.notificationType,
        roles: setting.roles.filter((role) =>
          staffEmailRoles[setting.notificationType]?.includes(
            role.role as (typeof staffEmailRoleList)[number]
          )
        ),
      }))
    )
  }),

  setStaffEmailSetting: tenantProcedure
    .input(setStaffEmailSettingSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanManageEmailSettings(ctx)

      const roles = staffEmailRoles[input.notificationType]

      if (!roles?.includes(input.role as (typeof staffEmailRoleList)[number])) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This email is not sent to that role.",
        })
      }

      await upsertNotificationPreference({
        actorUserId: ctx.auth.session.user.id,
        channel: "email",
        enabled: input.enabled,
        notificationType: input.notificationType,
        role: input.role,
        tenantId: ctx.tenant.current.id,
      })

      return { enabled: input.enabled }
    }),
})
