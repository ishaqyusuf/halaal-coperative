import {
  createSignedSessionTokenBundle,
  hashAuthEvidence,
  platformSessionScope,
} from "@halaalvest/auth"
import {
  createMobileDeviceSession,
  findMembershipsForUserAsync,
  getMemberByUserId,
  type MembershipRecord,
  type TenantRecord,
  type UserRecord,
} from "@halaalvest/db"
import { isQaAnalyticsPrincipal } from "@halaalvest/events/qa-policy-server"
import { issueAnalyticsContext } from "@halaalvest/events/attribution-server"
import { TRPCError } from "@trpc/server"

export function toMobileRole(role: MembershipRecord["role"]) {
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

export async function getLinkedMobileMember(input: {
  runtimeStatus: string
  tenantId: string
  userId: string
}) {
  if (input.runtimeStatus !== "database-configured") return null
  return getMemberByUserId({
    tenantId: input.tenantId,
    userId: input.userId,
  })
}

export async function assertMobileMemberWorkspaceEntitled(input: {
  membership: MembershipRecord
  runtimeStatus: string
  tenantId: string
}) {
  // Member identity and tenant membership are checked by the caller. The
  // cooperative's former software plan does not gate a free account login.
  void input
}

export function buildMobileProfile(input: {
  membership: MembershipRecord
  memberships: MembershipRecord[]
  member: Awaited<ReturnType<typeof getLinkedMobileMember>>
  qaAuthorizationId?: string
  sessionExpiresAt?: number
  tenant: TenantRecord
  token: string
  user: UserRecord
}) {
  const tenantMemberships = input.memberships.filter(
    (membership) => membership.tenantId === input.tenant.id
  )
  const availableMemberships =
    tenantMemberships.length > 0 ? tenantMemberships : [input.membership]

  const analyticsEnabled = !isQaAnalyticsPrincipal({
    email: input.user.email,
    qaSession: Boolean(input.qaAuthorizationId),
    dataClassification: input.tenant.dataClassification,
  })
  return {
    analyticsEnabled,
    analyticsContext: analyticsEnabled
      ? issueAnalyticsContext({
          project: "halaalvest-mobile",
          user: input.user,
          tenant: input.tenant,
          role: input.membership.role,
        })
      : null,
    activeMembershipId: input.membership.id,
    sessionExpiresAt: input.sessionExpiresAt
      ? new Date(input.sessionExpiresAt).toISOString()
      : undefined,
    token: input.token,
    qaAuthorized: Boolean(input.qaAuthorizationId),
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
      ? { id: input.member.id, code: input.member.memberNumber }
      : undefined,
  }
}

export async function issueMobileProfile(input: {
  device: {
    appVersion: string
    buildVariant: string
    deviceId: string
    deviceLabel: string
    platform: string
  }
  membership: MembershipRecord
  expiresAt?: number
  qaAuthorizationId?: string
  replacesToken?: string | null
  runtimeStatus: string
  tenant: TenantRecord
  user: UserRecord
}) {
  if (input.tenant.status !== "active") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This cooperative is not active for mobile access.",
    })
  }
  await assertMobileMemberWorkspaceEntitled({
    membership: input.membership,
    runtimeStatus: input.runtimeStatus,
    tenantId: input.tenant.id,
  })
  const [{ payload, token }, memberships, member] = await Promise.all([
    createSignedSessionTokenBundle({
      expiresAt: input.expiresAt,
      membershipId: input.membership.id,
      qaAuthorizationId: input.qaAuthorizationId,
      scope: platformSessionScope,
      sessionKind: "mobile",
      tenantId: input.tenant.id,
      userId: input.user.id,
    }),
    findMembershipsForUserAsync(input.user.id),
    getLinkedMobileMember({
      runtimeStatus: input.runtimeStatus,
      tenantId: input.tenant.id,
      userId: input.user.id,
    }),
  ])
  if (input.runtimeStatus === "database-configured") {
    await createMobileDeviceSession({
      actorUserId: input.user.id,
      appVersion: input.device.appVersion,
      buildVariant: input.device.buildVariant,
      deviceIdHash: hashAuthEvidence(`mobile-device:${input.device.deviceId}`),
      deviceLabel: input.device.deviceLabel,
      expiresAt: new Date(payload.expiresAt),
      membershipId: input.membership.id,
      platform: input.device.platform,
      replacesTokenHash: input.replacesToken
        ? hashAuthEvidence(`mobile-session:${input.replacesToken}`)
        : null,
      tenantId: input.tenant.id,
      tokenHash: hashAuthEvidence(`mobile-session:${token}`),
    })
  }
  return buildMobileProfile({
    membership: input.membership,
    memberships: memberships.length > 0 ? memberships : [input.membership],
    member,
    qaAuthorizationId: input.qaAuthorizationId,
    sessionExpiresAt: payload.expiresAt,
    tenant: input.tenant,
    token,
    user: input.user,
  })
}
