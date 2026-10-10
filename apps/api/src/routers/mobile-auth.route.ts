import { verifyPassword } from "@halaalvest/auth"
import {
  findActiveMembershipAsync,
  findUserByCooperativeAccessCodeAsync,
  findMembershipsForUserAsync,
  resolveTenantAsync,
  revokeMobileDeviceSession,
  type MembershipRecord,
  type TenantRecord,
  type UserRecord,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import {
  authenticatedProcedure,
  createTRPCRouter,
  publicProcedure,
} from "../lib.trpc"
import {
  assertMobileMemberWorkspaceEntitled,
  buildMobileProfile,
  getLinkedMobileMember,
  issueMobileProfile,
} from "./mobile-auth-profile"
import {
  enforcePublicAuthLimits,
  enforceTenantAuthLimit,
  mobileRecoveryRouter,
} from "./mobile-account-access.route"

const mobileSignInInput = z.object({
  cooperativeAccessCode: z.string().trim().min(3).max(96),
  password: z.string().min(1),
})

const mobileSwitchRoleInput = z.object({
  membershipId: z.string().min(1),
})

export const mobileAuthRouter = createTRPCRouter({
  recovery: mobileRecoveryRouter,
  signIn: publicProcedure
    .input(mobileSignInInput)
    .mutation(async ({ ctx, input }) => {
      await enforcePublicAuthLimits({
        account: input.cooperativeAccessCode.trim().toUpperCase(),
        ctx,
        operation: "sign_in",
      })
      const user = await findUserByCooperativeAccessCodeAsync(
        input.cooperativeAccessCode
      )
      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "The cooperative number or account details were invalid.",
        })
      }
      const tenantResolution = await resolveTenantAsync({
        fallbackTenantId: user.tenantId,
      })

      if (!tenantResolution.tenant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "The cooperative number or account details were invalid.",
        })
      }
      await enforceTenantAuthLimit({
        operation: "sign_in",
        tenantId: tenantResolution.tenant.id,
      })

      const membership = await findActiveMembershipAsync({
        tenantId: tenantResolution.tenant.id,
        userId: user.id,
      })

      if (!membership && !user.isPlatformOwner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This account is not active for the selected cooperative.",
        })
      }

      const resolvedMembership =
        membership ??
        ({
          id: "platform-owner-mobile-membership",
          isDefault: true,
          role: "super_admin",
          tenantId: tenantResolution.tenant.id,
          userId: user.id,
        } satisfies MembershipRecord)
      await assertMobileMemberWorkspaceEntitled({
        membership: resolvedMembership,
        runtimeStatus: ctx.runtime.status,
        tenantId: tenantResolution.tenant.id,
      })
      const memberships = await findMembershipsForUserAsync(user.id)
      return {
        profile: await issueMobileProfile({
          device: {
            ...ctx.request.mobile,
            deviceId: ctx.request.deviceSignal,
          },
          membership: resolvedMembership,
          runtimeStatus: ctx.runtime.status,
          tenant: tenantResolution.tenant,
          user,
        }),
      }
    }),

  me: authenticatedProcedure.query(async ({ ctx }) => {
    const session = ctx.auth.session
    const tenant = ctx.tenant.current
    const membership = ctx.auth.activeMembership

    if (!tenant || !session || !membership) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "An active mobile session is required.",
      })
    }

    await assertMobileMemberWorkspaceEntitled({
      membership,
      runtimeStatus: ctx.runtime.status,
      tenantId: tenant.id,
    })

    const memberships = await findMembershipsForUserAsync(session.user.id)
    const member = await getLinkedMobileMember({
      runtimeStatus: ctx.runtime.status,
      tenantId: tenant.id,
      userId: session.user.id,
    })

    return {
      profile: buildMobileProfile({
        membership,
        memberships: memberships.length > 0 ? memberships : [membership],
        member,
        qaAuthorizationId: session.qaAuthorizationId,
        sessionExpiresAt: session.sessionExpiresAt,
        tenant,
        token: session.token,
        user: session.user,
      }),
    }
  }),

  switchRole: authenticatedProcedure
    .input(mobileSwitchRoleInput)
    .mutation(async ({ ctx, input }) => {
      const session = ctx.auth.session

      if (!session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "An active mobile session is required.",
        })
      }

      const memberships = await findMembershipsForUserAsync(session.user.id)
      const membership =
        memberships.find((candidate) => candidate.id === input.membershipId) ??
        null

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "That mobile workspace is not available for this account.",
        })
      }

      const tenantResolution = await resolveTenantAsync({
        fallbackTenantId: membership.tenantId,
      })

      if (!tenantResolution.tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The selected cooperative workspace was not found.",
        })
      }

      await assertMobileMemberWorkspaceEntitled({
        membership,
        runtimeStatus: ctx.runtime.status,
        tenantId: tenantResolution.tenant.id,
      })

      return {
        profile: await issueMobileProfile({
          device: {
            ...ctx.request.mobile,
            deviceId: ctx.request.deviceSignal,
          },
          membership,
          replacesToken: session.token,
          runtimeStatus: ctx.runtime.status,
          tenant: tenantResolution.tenant,
          user: session.user,
        }),
      }
    }),

  signOut: authenticatedProcedure.mutation(async ({ ctx }) => {
    const session = ctx.auth.session
    if (!session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "An active mobile session is required.",
      })
    }
    if (session.mobileDeviceSessionId && ctx.tenant.current) {
      await revokeMobileDeviceSession({
        actorUserId: session.user.id,
        reason: "signed_out",
        sessionId: session.mobileDeviceSessionId,
        tenantId: ctx.tenant.current.id,
        userId: session.user.id,
      })
    }
    return { ok: true as const }
  }),
})
