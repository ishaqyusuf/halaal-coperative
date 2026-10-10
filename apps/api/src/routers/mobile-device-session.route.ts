import { hashAuthEvidence } from "@halaalvest/auth"
import type { AuthSession } from "@halaalvest/auth"
import {
  listMobileDeviceSessions,
  listMobileDeviceSessionsForAdmin,
  revokeAllMobileDeviceSessions,
  revokeMobileDeviceSession,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import { permissionProcedure, tenantProcedure } from "../lib.trpc"
import { issueMobileProfile } from "./mobile-auth-profile"

const sessionIdInput = z.object({ sessionId: z.string().uuid() })
const targetUserInput = z.object({ userId: z.string().uuid() })
const targetSessionInput = targetUserInput.extend({
  sessionId: z.string().uuid(),
})

export function getMobileSessionRefreshBounds(
  session: Pick<AuthSession, "qaAuthorizationId" | "sessionExpiresAt">
) {
  if (!session.qaAuthorizationId) return {}
  if (!session.sessionExpiresAt) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "The QA-authorized mobile session is missing its expiry.",
    })
  }
  return {
    expiresAt: session.sessionExpiresAt,
    qaAuthorizationId: session.qaAuthorizationId,
  }
}

export const mobileDeviceSessionProcedures = {
  list: tenantProcedure.query(({ ctx }) =>
    listMobileDeviceSessions({
      currentTokenHash: hashAuthEvidence(
        `mobile-session:${ctx.auth.session.token}`
      ),
      tenantId: ctx.tenant.current.id,
      userId: ctx.auth.session.user.id,
    })
  ),

  refresh: tenantProcedure.mutation(async ({ ctx }) => ({
    profile: await issueMobileProfile({
      device: {
        ...ctx.request.mobile,
        deviceId: ctx.request.deviceSignal,
      },
      membership: ctx.auth.activeMembership,
      ...getMobileSessionRefreshBounds(ctx.auth.session),
      replacesToken: ctx.auth.session.token,
      runtimeStatus: ctx.runtime.status,
      tenant: ctx.tenant.current,
      user: ctx.auth.session.user,
    }),
  })),

  revoke: tenantProcedure
    .input(sessionIdInput)
    .mutation(async ({ ctx, input }) => {
      const result = await revokeMobileDeviceSession({
        actorUserId: ctx.auth.session.user.id,
        reason: "user_revoked",
        sessionId: input.sessionId,
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
      return {
        ...result,
        revokedCurrent:
          ctx.auth.session.mobileDeviceSessionId === input.sessionId,
      }
    }),

  revokeAll: tenantProcedure.mutation(async ({ ctx }) => ({
    ...(await revokeAllMobileDeviceSessions({
      actorUserId: ctx.auth.session.user.id,
      reason: "sign_out_all",
      tenantId: ctx.tenant.current.id,
      userId: ctx.auth.session.user.id,
    })),
    revokedCurrent: true as const,
  })),

  adminList: permissionProcedure("manage_roles")
    .input(targetUserInput)
    .query(({ ctx, input }) =>
      listMobileDeviceSessionsForAdmin({
        tenantId: ctx.tenant.current.id,
        userId: input.userId,
      })
    ),

  adminRevoke: permissionProcedure("manage_roles")
    .input(targetSessionInput)
    .mutation(({ ctx, input }) =>
      revokeMobileDeviceSession({
        actorUserId: ctx.auth.session.user.id,
        reason: "compromised",
        sessionId: input.sessionId,
        tenantId: ctx.tenant.current.id,
        userId: input.userId,
      })
    ),

  adminRevokeAll: permissionProcedure("manage_roles")
    .input(targetUserInput)
    .mutation(({ ctx, input }) =>
      revokeAllMobileDeviceSessions({
        actorUserId: ctx.auth.session.user.id,
        reason: "security_reset",
        tenantId: ctx.tenant.current.id,
        userId: input.userId,
      })
    ),
}
