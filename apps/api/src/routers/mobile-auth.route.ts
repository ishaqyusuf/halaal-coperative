import { verifyPassword } from "@halaalvest/auth"
import {
  findUserByCooperativeAccessCodeAsync,
  findMembershipsForUserAsync,
  getTenantByIdAsync,
  listMobileWorkspacesForUserAsync,
  resolveTenantAsync,
  revokeMobileDeviceSession,
  selectActiveMembership,
  type MembershipRecord,
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
  assertMobileWorkspaceSwitchAllowed,
  buildMobileProfile,
  buildTenantMark,
  getLinkedMobileMember,
  issueMobileProfile,
  readSignInAccessSnapshot,
  toMobileRole,
} from "./mobile-auth-profile"
import {
  enforcePublicAuthLimits,
  enforceTenantAuthLimit,
  mobileRecoveryRouter,
} from "./mobile-account-access.route"
import { getMobileSessionRefreshBounds } from "./mobile-device-session.route"

const mobileSignInInput = z.object({
  cooperativeAccessCode: z.string().trim().min(3).max(96),
  // Set when the sign-in came from a cooperative's home-screen shortcut.
  cooperativeId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{1,64}$/)
    .optional(),
  password: z.string().min(1),
})

export const MOBILE_SIGN_IN_OTHER_COOPERATIVE_MESSAGE =
  "This account isn't part of the selected cooperative."

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
      // Everything below depends only on the verified user, so the tenant
      // read, the tenant rate limit, the memberships and the linked member
      // run as one wave. Memberships are read once and reused by the profile.
      const [tenant, , memberships, member] = await Promise.all([
        getTenantByIdAsync(user.tenantId, { withMemberCount: false }),
        enforceTenantAuthLimit({
          operation: "sign_in",
          tenantId: user.tenantId,
        }),
        findMembershipsForUserAsync(user.id),
        getLinkedMobileMember({
          runtimeStatus: ctx.runtime.status,
          tenantId: user.tenantId,
          userId: user.id,
        }),
      ])

      if (!tenant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "The cooperative number or account details were invalid.",
        })
      }

      // A cooperative shortcut's sign-in only admits that cooperative's
      // accounts. Checked after the password, so it reveals nothing to a
      // caller who doesn't hold the account.
      if (
        input.cooperativeId &&
        input.cooperativeId !== tenant.id &&
        !selectActiveMembership(memberships, input.cooperativeId)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: MOBILE_SIGN_IN_OTHER_COOPERATIVE_MESSAGE,
        })
      }

      const membership = selectActiveMembership(memberships, tenant.id)

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
          tenantId: tenant.id,
          userId: user.id,
        } satisfies MembershipRecord)
      await assertMobileMemberWorkspaceEntitled({
        membership: resolvedMembership,
        runtimeStatus: ctx.runtime.status,
        tenantId: tenant.id,
      })
      const [profile, accessSnapshot] = await Promise.all([
        issueMobileProfile({
          device: {
            ...ctx.request.mobile,
            deviceId: ctx.request.deviceSignal,
          },
          member,
          membership: resolvedMembership,
          memberships,
          runtimeStatus: ctx.runtime.status,
          tenant,
          user,
        }),
        membership
          ? readSignInAccessSnapshot({
              membershipId: membership.id,
              runtimeStatus: ctx.runtime.status,
              tenantId: tenant.id,
              userId: user.id,
            })
          : undefined,
      ])
      return { accessSnapshot, profile }
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

    // One read wave: memberships, the linked member and the app-access
    // snapshot are independent. Returning the snapshot saves the app's cold
    // start a second authenticated request (cooperativeMobileAccess.snapshot)
    // before it can open the workspace (T03).
    const [memberships, member, accessSnapshot] = await Promise.all([
      findMembershipsForUserAsync(session.user.id),
      getLinkedMobileMember({
        runtimeStatus: ctx.runtime.status,
        tenantId: tenant.id,
        userId: session.user.id,
      }),
      ctx.request.mobileAuthenticated
        ? readSignInAccessSnapshot({
            membershipId: membership.id,
            runtimeStatus: ctx.runtime.status,
            tenantId: tenant.id,
            userId: session.user.id,
          })
        : Promise.resolve(undefined),
    ])

    return {
      accessSnapshot,
      profile: await buildMobileProfile({
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

  // Current-user cooperative discovery for the workspace picker and launcher
  // shortcuts. It accepts no user or tenant selector and returns no business
  // data; switchRole remains the only authority that changes context.
  workspaces: authenticatedProcedure.query(async ({ ctx }) => {
    const session = ctx.auth.session
    const tenant = ctx.tenant.current

    if (!session || !tenant || !ctx.auth.activeMembership) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "An active mobile session is required.",
      })
    }

    const workspaces = await listMobileWorkspacesForUserAsync({
      currentTenantId: tenant.id,
      qaSession: Boolean(session.qaAuthorizationId),
      userId: session.user.id,
    })

    return {
      workspaces: workspaces.map((workspace) => ({
        isCurrent: workspace.isCurrent,
        memberships: workspace.memberships.map((membership) => ({
          id: membership.id,
          isDefault: membership.isDefault,
          role: membership.role,
          workspaceRole: toMobileRole(membership.role),
        })),
        tenant: {
          id: workspace.tenant.id,
          // No trusted cooperative logo source exists yet; the mark is the
          // approved launcher artwork until one is wired.
          logoUrl: null,
          mark: buildTenantMark(workspace.tenant.name),
          name: workspace.tenant.name,
        },
      })),
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

      assertMobileWorkspaceSwitchAllowed({
        currentTenantId: ctx.tenant.current?.id,
        qaSession: Boolean(session.qaAuthorizationId),
        targetTenantId: membership.tenantId,
      })

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
          // A QA-authorized session keeps its exact authorization and expiry
          // bound instead of widening into an ordinary session.
          ...getMobileSessionRefreshBounds(session),
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
