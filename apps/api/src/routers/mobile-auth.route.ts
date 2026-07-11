import {
  createSignedSessionToken,
  platformSessionScope,
  verifyPassword,
} from "@halaalvest/auth"
import {
  findActiveMembershipAsync,
  findMembershipsForUserAsync,
  findUserByEmailAsync,
  getMemberByUserId,
  resolveTenantAsync,
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

const mobileSignInInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
})

const mobileSwitchRoleInput = z.object({
  membershipId: z.string().min(1),
})

function toMobileRole(role: MembershipRecord["role"]) {
  return role === "member" ? "member" : "admin"
}

function buildTenantMark(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length <= 1) {
    return name.trim().slice(0, 2).toUpperCase() || "HC"
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("")
}

async function getLinkedMember(input: {
  runtimeStatus: string
  tenantId: string
  userId: string
}) {
  if (input.runtimeStatus !== "database-configured") {
    return null
  }

  return getMemberByUserId({
    tenantId: input.tenantId,
    userId: input.userId,
  })
}

function buildMobileProfile(input: {
  membership: MembershipRecord
  memberships: MembershipRecord[]
  member: Awaited<ReturnType<typeof getLinkedMember>>
  tenant: TenantRecord
  token: string
  user: UserRecord
}) {
  const tenantMemberships = input.memberships.filter(
    (membership) => membership.tenantId === input.tenant.id
  )
  const availableMemberships =
    tenantMemberships.length > 0 ? tenantMemberships : [input.membership]

  return {
    activeMembershipId: input.membership.id,
    token: input.token,
    role: toMobileRole(input.membership.role),
    cooperativeRole: input.membership.role,
    availableRoles: availableMemberships.map((membership) => ({
      id: membership.id,
      isDefault: membership.isDefault,
      role: membership.role,
      workspaceRole: toMobileRole(membership.role),
    })),
    tenant: {
      branding: {
        accentColor: null,
        logoUrl: null,
        mark: buildTenantMark(input.tenant.name),
        primaryColor: null,
      },
      currencyCode: input.tenant.currencyCode,
      id: input.tenant.id,
      name: input.tenant.name,
      slug: input.tenant.slug,
      timezone: input.tenant.timezone,
    },
    user: {
      id: input.user.id,
      name: input.user.fullName,
      email: input.user.email,
    },
    member: input.member
      ? {
          id: input.member.id,
          code: input.member.memberNumber,
        }
      : undefined,
  }
}

export const mobileAuthRouter = createTRPCRouter({
  signIn: publicProcedure
    .input(mobileSignInInput)
    .mutation(async ({ ctx, input }) => {
      const tenantResolution = await resolveTenantAsync({
        slug: input.tenantSlug,
      })

      if (!tenantResolution.tenant) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "The cooperative code or account details were invalid.",
        })
      }

      const user = await findUserByEmailAsync({
        email: input.email,
        tenantId: tenantResolution.tenant.id,
      })

      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "The cooperative code or account details were invalid.",
        })
      }

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
      const memberships = await findMembershipsForUserAsync(user.id)
      const token = await createSignedSessionToken({
        membershipId: resolvedMembership.id,
        scope: platformSessionScope,
        tenantId: tenantResolution.tenant.id,
        userId: user.id,
      })
      const member = await getLinkedMember({
        runtimeStatus: ctx.runtime.status,
        tenantId: tenantResolution.tenant.id,
        userId: user.id,
      })

      return {
        profile: buildMobileProfile({
          membership: resolvedMembership,
          memberships:
            memberships.length > 0 ? memberships : [resolvedMembership],
          member,
          tenant: tenantResolution.tenant,
          token,
          user,
        }),
      }
    }),

  me: authenticatedProcedure.query(async ({ ctx }) => {
    if (!ctx.tenant.current || !ctx.auth.activeMembership) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "An active mobile session is required.",
      })
    }

    const memberships = await findMembershipsForUserAsync(
      ctx.auth.session.user.id
    )
    const member = await getLinkedMember({
      runtimeStatus: ctx.runtime.status,
      tenantId: ctx.tenant.current.id,
      userId: ctx.auth.session.user.id,
    })

    return {
      profile: buildMobileProfile({
        membership: ctx.auth.activeMembership,
        memberships:
          memberships.length > 0 ? memberships : [ctx.auth.activeMembership],
        member,
        tenant: ctx.tenant.current,
        token: ctx.auth.session.token,
        user: ctx.auth.session.user,
      }),
    }
  }),

  switchRole: authenticatedProcedure
    .input(mobileSwitchRoleInput)
    .mutation(async ({ ctx, input }) => {
      const memberships = await findMembershipsForUserAsync(
        ctx.auth.session.user.id
      )
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

      const token = await createSignedSessionToken({
        membershipId: membership.id,
        scope: platformSessionScope,
        tenantId: membership.tenantId,
        userId: ctx.auth.session.user.id,
      })
      const member = await getLinkedMember({
        runtimeStatus: ctx.runtime.status,
        tenantId: tenantResolution.tenant.id,
        userId: ctx.auth.session.user.id,
      })

      return {
        profile: buildMobileProfile({
          membership,
          memberships,
          member,
          tenant: tenantResolution.tenant,
          token,
          user: ctx.auth.session.user,
        }),
      }
    }),

  signOut: authenticatedProcedure.mutation(() => {
    return { ok: true as const }
  }),
})
