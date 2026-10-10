import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  createSignedSessionTokenBundle,
  hashAuthEvidence,
  platformSessionScope,
} from "@halaalvest/auth"
import {
  createMobileDeviceSession,
  createPrismaClient,
  transitionTenantSubscription,
} from "@halaalvest/db"

import { buildRequestContext } from "../context"
import { createCallerFactory } from "../lib.trpc"
import { appRouter } from "./_app"
import { issueMobileProfile } from "./mobile-auth-profile"

const prisma = createPrismaClient()
const runIntegration = prisma ? describe : describe.skip
const slug = `mobile-session-api-${crypto.randomUUID().slice(0, 8)}`
const createCaller = createCallerFactory(appRouter)

type Identity = {
  membershipId: string
  tenantId: string
  userId: string
}

runIntegration("mobile device session API", () => {
  let admin: Identity
  let finance: Identity
  let member: Identity
  let otherTenantMember: Identity
  let primaryTenantId: string | null = null
  let otherTenantId: string | null = null
  let pendingTenantId: string | null = null

  beforeAll(async () => {
    if (!prisma) return
    const [primaryTenant, otherTenant] = await Promise.all([
      prisma.tenant.create({
        data: { name: "Session API Cooperative", slug, status: "active" },
      }),
      prisma.tenant.create({
        data: {
          name: "Other Session Cooperative",
          slug: `${slug}-other`,
          status: "active",
        },
      }),
    ])
    primaryTenantId = primaryTenant.id
    otherTenantId = otherTenant.id
    await transitionTenantSubscription(
      {
        planCode: "standard",
        reason: "mobile device session integration coverage",
        source: "manual",
        status: "active",
        tenantId: primaryTenant.id,
      },
      prisma
    )

    async function createIdentity(input: {
      label: string
      role: "finance_officer" | "member" | "tenant_admin"
      tenantId: string
    }): Promise<Identity> {
      const user = await prisma.user.create({
        data: {
          email: `${slug}-${input.label}@example.test`,
          fullName: `Session API ${input.label}`,
          tenantId: input.tenantId,
        },
      })
      const membership = await prisma.membership.create({
        data: {
          isDefault: true,
          role: input.role,
          tenantId: input.tenantId,
          userId: user.id,
        },
      })
      if (input.role === "member") {
        await prisma.member.create({
          data: {
            email: user.email,
            fullName: user.fullName,
            joinedAt: new Date(),
            memberNumber: `API-${input.label.toUpperCase()}`,
            memberType: "individual",
            status: "active",
            tenantId: input.tenantId,
            userId: user.id,
          },
        })
      }
      return {
        membershipId: membership.id,
        tenantId: input.tenantId,
        userId: user.id,
      }
    }

    ;[admin, finance, member, otherTenantMember] = await Promise.all([
      createIdentity({
        label: "admin",
        role: "tenant_admin",
        tenantId: primaryTenant.id,
      }),
      createIdentity({
        label: "finance",
        role: "finance_officer",
        tenantId: primaryTenant.id,
      }),
      createIdentity({
        label: "member",
        role: "member",
        tenantId: primaryTenant.id,
      }),
      createIdentity({
        label: "other-member",
        role: "member",
        tenantId: otherTenant.id,
      }),
    ])
  })

  afterAll(async () => {
    if (prisma) {
      if (primaryTenantId) {
        await prisma.tenant.deleteMany({ where: { id: primaryTenantId } })
      }
      if (otherTenantId) {
        await prisma.tenant.deleteMany({ where: { id: otherTenantId } })
      }
      if (pendingTenantId) {
        await prisma.tenant.deleteMany({ where: { id: pendingTenantId } })
      }
      await prisma.$disconnect()
    }
  })

  async function createSession(input: {
    deviceId: string
    deviceLabel: string
    identity: Identity
  }) {
    if (!prisma)
      throw new Error("Database integration test was not configured.")
    const { payload, token } = await createSignedSessionTokenBundle({
      membershipId: input.identity.membershipId,
      scope: platformSessionScope,
      sessionKind: "mobile",
      tenantId: input.identity.tenantId,
      userId: input.identity.userId,
    })
    const session = await createMobileDeviceSession(
      {
        actorUserId: input.identity.userId,
        appVersion: "1.0.0",
        buildVariant: "development",
        deviceIdHash: hashAuthEvidence(`mobile-device:${input.deviceId}`),
        deviceLabel: input.deviceLabel,
        expiresAt: new Date(payload.expiresAt),
        membershipId: input.identity.membershipId,
        platform: "android",
        tenantId: input.identity.tenantId,
        tokenHash: hashAuthEvidence(`mobile-session:${token}`),
      },
      prisma
    )
    return { session, token }
  }

  async function callerFor(input: { deviceId: string; token: string }) {
    const context = await buildRequestContext(
      new Headers({
        authorization: `Bearer ${input.token}`,
        host: "api.halaalvest.localhost",
        "x-mobile-app-version": "1.0.0",
        "x-mobile-build-variant": "development",
        "x-mobile-device-id": input.deviceId,
        "x-mobile-device-label": "Pixel 3a",
        "x-mobile-platform": "android",
        "x-trpc-source": "mobile",
      })
    )
    return { caller: createCaller(context), context }
  }

  test("lists, rotates, revokes and invalidates a user's own sessions", async () => {
    const current = await createSession({
      deviceId: "member-current",
      deviceLabel: "Pixel 3a",
      identity: member,
    })
    const other = await createSession({
      deviceId: "member-other",
      deviceLabel: "Galaxy A54",
      identity: member,
    })
    const { caller } = await callerFor({
      deviceId: "member-current",
      token: current.token,
    })

    const listed = await caller.mobile.sessions.list()
    expect(listed).toHaveLength(2)
    expect(
      listed.find((session) => session.id === current.session.id)?.current
    ).toBe(true)
    await expect(
      caller.mobile.sessions.revoke({ sessionId: other.session.id })
    ).resolves.toMatchObject({ revoked: true, revokedCurrent: false })
    const revokedContext = await callerFor({
      deviceId: "member-other",
      token: other.token,
    })
    expect(revokedContext.context.auth.session).toBeNull()

    const refreshed = await caller.mobile.sessions.refresh()
    expect(refreshed.profile.token).not.toBe(current.token)
    const oldContext = await callerFor({
      deviceId: "member-current",
      token: current.token,
    })
    expect(oldContext.context.auth.session).toBeNull()
    const rotated = await callerFor({
      deviceId: "member-current",
      token: refreshed.profile.token,
    })
    await expect(rotated.caller.mobile.sessions.list()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ current: true, deviceLabel: "Pixel 3a" }),
      ])
    )
    await expect(
      rotated.caller.mobile.sessions.revokeAll()
    ).resolves.toMatchObject({
      revokedCurrent: true,
    })
    const cleared = await callerFor({
      deviceId: "member-current",
      token: refreshed.profile.token,
    })
    expect(cleared.context.auth.session).toBeNull()
  })

  test("allows manage_roles admins and denies weaker or cross-tenant access", async () => {
    const memberSession = await createSession({
      deviceId: "member-managed-one",
      deviceLabel: "Managed Pixel",
      identity: member,
    })
    await createSession({
      deviceId: "member-managed-two",
      deviceLabel: "Managed Tablet",
      identity: member,
    })
    const adminSession = await createSession({
      deviceId: "admin-current",
      deviceLabel: "Admin Pixel",
      identity: admin,
    })
    const financeSession = await createSession({
      deviceId: "finance-current",
      deviceLabel: "Finance Pixel",
      identity: finance,
    })
    const adminCaller = (
      await callerFor({ deviceId: "admin-current", token: adminSession.token })
    ).caller
    const financeCaller = (
      await callerFor({
        deviceId: "finance-current",
        token: financeSession.token,
      })
    ).caller

    const managed = await adminCaller.mobile.sessions.adminList({
      userId: member.userId,
    })
    expect(managed.owner.id).toBe(member.userId)
    expect(managed.sessions.length).toBeGreaterThanOrEqual(2)
    expect(
      managed.sessions.filter((session) => session.revokedAt === null)
    ).toHaveLength(2)
    await expect(
      financeCaller.mobile.sessions.adminList({ userId: member.userId })
    ).rejects.toThrow("permission")
    await expect(
      adminCaller.mobile.sessions.adminList({
        userId: otherTenantMember.userId,
      })
    ).rejects.toThrow("Workspace user was not found")

    await expect(
      adminCaller.mobile.sessions.adminRevoke({
        sessionId: memberSession.session.id,
        userId: member.userId,
      })
    ).resolves.toMatchObject({ revoked: true })
    const revoked = await callerFor({
      deviceId: "member-managed-one",
      token: memberSession.token,
    })
    expect(revoked.context.auth.session).toBeNull()
    await expect(
      adminCaller.mobile.sessions.adminRevokeAll({ userId: member.userId })
    ).resolves.toMatchObject({ count: 1 })
  })

  test("rotates the durable session when the active cooperative role changes", async () => {
    if (!prisma)
      throw new Error("Database integration test was not configured.")
    const operationsMembership = await prisma.membership.create({
      data: {
        isDefault: false,
        role: "operations_officer",
        tenantId: admin.tenantId,
        userId: admin.userId,
      },
    })
    const current = await createSession({
      deviceId: "admin-role-switch",
      deviceLabel: "Admin Role Pixel",
      identity: admin,
    })
    const original = await callerFor({
      deviceId: "admin-role-switch",
      token: current.token,
    })

    const switched = await original.caller.auth.mobile.switchRole({
      membershipId: operationsMembership.id,
    })

    expect(switched.profile.activeMembershipId).toBe(operationsMembership.id)
    expect(switched.profile.cooperativeRole).toBe("operations_officer")
    expect(switched.profile.token).not.toBe(current.token)
    const replaced = await callerFor({
      deviceId: "admin-role-switch",
      token: current.token,
    })
    expect(replaced.context.auth.session).toBeNull()
    const active = await callerFor({
      deviceId: "admin-role-switch",
      token: switched.profile.token,
    })
    expect(active.context.auth.activeMembership?.id).toBe(
      operationsMembership.id
    )
    await expect(active.caller.mobile.sessions.list()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          current: true,
          revokedAt: null,
        }),
      ])
    )
  })

  test("does not issue an unusable mobile session for a pending cooperative", async () => {
    if (!prisma)
      throw new Error("Database integration test was not configured.")
    const pendingTenant = await prisma.tenant.create({
      data: {
        name: "Pending Session Cooperative",
        slug: `${slug}-pending`,
        status: "pending",
      },
    })
    pendingTenantId = pendingTenant.id
    const user = await prisma.user.create({
      data: {
        email: `${slug}-pending@example.test`,
        fullName: "Pending Session User",
        tenantId: pendingTenant.id,
      },
    })
    const membership = await prisma.membership.create({
      data: {
        isDefault: true,
        role: "tenant_admin",
        tenantId: pendingTenant.id,
        userId: user.id,
      },
    })

    await expect(
      issueMobileProfile({
        device: {
          appVersion: "1.0.0",
          buildVariant: "development",
          deviceId: "pending-device",
          deviceLabel: "Pending Pixel",
          platform: "android",
        },
        membership: {
          id: membership.id,
          isDefault: membership.isDefault,
          role: membership.role,
          tenantId: membership.tenantId,
          userId: membership.userId,
        },
        runtimeStatus: "database-configured",
        tenant: {
          cooperativeCodePrefix: pendingTenant.cooperativeCodePrefix,
          country: pendingTenant.country,
          currencyCode: pendingTenant.currencyCode,
          currentSize: pendingTenant.currentSize,
          dataClassification: pendingTenant.dataClassification,
          id: pendingTenant.id,
          memberCount: 0,
          memberNumberPrefix: pendingTenant.memberNumberPrefix,
          name: pendingTenant.name,
          officeAddress: pendingTenant.officeAddress,
          qaPurgeStartedAt:
            pendingTenant.qaPurgeStartedAt?.toISOString() ?? null,
          region: pendingTenant.region,
          slug: pendingTenant.slug,
          startDate: pendingTenant.startDate?.toISOString() ?? null,
          status: pendingTenant.status,
          timezone: pendingTenant.timezone,
        },
        user: {
          createdAt: user.createdAt.toISOString(),
          deletedAt: null,
          email: user.email,
          fullName: user.fullName,
          id: user.id,
          isPlatformOwner: user.isPlatformOwner,
          passwordHash: user.passwordHash,
          phoneNumber: user.phoneNumber,
          tenantId: user.tenantId,
          updatedAt: user.updatedAt.toISOString(),
        },
      })
    ).rejects.toThrow("not active for mobile access")
    const issuedSessionCount = await prisma.mobileDeviceSession.count({
      where: { userId: user.id },
    })
    expect(issuedSessionCount).toBe(0)
  })
})
