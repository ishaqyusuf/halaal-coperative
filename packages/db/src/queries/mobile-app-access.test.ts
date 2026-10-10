import { describe, expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import {
  applyVerifiedMobileAppAccess,
  getMobileAppAccessSnapshot,
  mobileAppAccessAllowed,
  type VerifiedMobileAppAccess,
} from "./mobile-app-access"

const userId = "11111111-1111-4111-8111-111111111111"
const tenantId = "22222222-2222-4222-8222-222222222222"
const secondTenantId = "33333333-3333-4333-8333-333333333333"
const verifiedAt = new Date("2026-09-28T00:00:00Z")
const evidence: VerifiedMobileAppAccess = {
  userBinding: userId,
  providerName: "apple_app_store",
  providerSubscriptionId: "original-123",
  productId: "halaalvest.app.sixmonth",
  duration: "six_months",
  status: "active",
  periodStartsAt: new Date("2026-03-28T00:00:00Z"),
  periodEndsAt: new Date("2026-09-29T00:00:00Z"),
  graceEndsAt: null,
  cancelAtPeriodEnd: false,
  verifiedAt,
  environment: "production",
}

function database(
  options: {
    ownerId?: string
    currentAt?: Date
    currentHash?: string
    previousOwnerId?: string
    memberTenants?: string[]
    purchaseTenantId?: string
    deleted?: boolean
    previousEnvironment?: "production" | "sandbox"
    qa?: boolean
    purging?: boolean
  } = {}
) {
  const writes: unknown[] = []
  const current = options.ownerId
    ? {
        id: "purchase-1",
        tenantId: options.purchaseTenantId ?? tenantId,
        userId: options.ownerId,
        environment: "production",
        lastVerifiedAt: options.currentAt ?? verifiedAt,
        lastEvidenceHash: options.currentHash ?? "different",
      }
    : null
  const tx = {
    user: {
      findUnique: async () => ({
        id: userId,
        tenantId,
        deletedAt: options.deleted ? new Date("2026-09-28T12:00:00Z") : null,
        tenant: {
          dataClassification: options.qa ? "qa" : "live",
          qaSourceDomain: options.qa ? "qa.test" : null,
          qaPurgeStartedAt: options.purging ? verifiedAt : null,
        },
      }),
    },
    membership: {
      findFirst: async (query: {
        where: { tenantId: string; userId: string }
      }) =>
        query.where.userId === userId &&
        (options.memberTenants ?? [tenantId]).includes(query.where.tenantId)
          ? { id: "membership-1" }
          : null,
    },
    mobileAppAccessPurchase: {
      findUnique: async (query: {
        where: {
          providerName_providerSubscriptionId: {
            providerSubscriptionId: string
          }
        }
      }) =>
        query.where.providerName_providerSubscriptionId
          .providerSubscriptionId === evidence.providerSubscriptionId
          ? current
          : options.previousOwnerId
            ? {
                userId: options.previousOwnerId,
                environment: options.previousEnvironment ?? "production",
              }
            : null,
      create: async (query: { data: unknown }) => {
        writes.push(query)
        return { id: "purchase-1" }
      },
      update: async (query: { data: unknown }) => {
        writes.push(query)
        return { id: "purchase-1" }
      },
    },
    mobileAppAccessProviderEvent: {
      findUnique: async () => null,
      create: async (query: unknown) => writes.push(query),
    },
    auditLog: { create: async (query: unknown) => writes.push(query) },
  }
  const prisma = {
    $transaction: async (run: (value: typeof tx) => Promise<unknown>) =>
      run(tx),
    mobileAppAccessPurchase: {
      findMany: async (query: { where: { user?: { deletedAt: null } } }) =>
        options.deleted && query.where.user?.deletedAt === null
          ? []
          : [
              {
                id: "purchase-1",
                duration: "six_months",
                status: "active",
                periodEndsAt: evidence.periodEndsAt,
                graceEndsAt: null,
                cancelAtPeriodEnd: false,
                providerName: "apple_app_store",
              },
            ],
    },
  } as unknown as PrismaClient
  return { prisma, writes }
}

describe("personal mobile app access persistence", () => {
  test("rejects another account, foreign store chain, linked foreign chain and purging tenants", async () => {
    for (const [db, candidate, expectedUserId] of [
      [database(), evidence, "33333333-3333-4333-8333-333333333333"],
      [database({ ownerId: "foreign-user" }), evidence, userId],
      [
        database({ previousOwnerId: "foreign-user" }),
        { ...evidence, previousProviderSubscriptionId: "previous" },
        userId,
      ],
      [database({ purging: true }), evidence, userId],
    ] as const) {
      await expect(
        applyVerifiedMobileAppAccess(
          { evidence: candidate, expectedUserId },
          db.prisma
        )
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" })
      expect(db.writes).toHaveLength(0)
    }
  })

  test("applies once, rejects equal-time conflict, and ignores older evidence", async () => {
    const fresh = database()
    expect(
      await applyVerifiedMobileAppAccess({ evidence }, fresh.prisma)
    ).toMatchObject({
      applied: true,
      userId,
    })
    expect(fresh.writes).toHaveLength(3)
    const existing = database({
      ownerId: userId,
      currentAt: new Date("2026-09-29T00:00:00Z"),
    })
    expect(
      await applyVerifiedMobileAppAccess({ evidence }, existing.prisma)
    ).toMatchObject({ applied: false })
    expect(existing.writes).toHaveLength(0)
    const conflict = database({ ownerId: userId })
    await expect(
      applyVerifiedMobileAppAccess({ evidence }, conflict.prisma)
    ).rejects.toMatchObject({ code: "CONFLICT" })
    expect(conflict.writes).toHaveLength(0)
  })

  test("one user's purchase works across cooperative memberships but not an unrelated tenant", async () => {
    const member = database({ memberTenants: [tenantId, secondTenantId] })
    expect(
      await applyVerifiedMobileAppAccess(
        { evidence, expectedUserId: userId, expectedTenantId: secondTenantId },
        member.prisma
      )
    ).toMatchObject({ applied: true, userId })
    expect(member.writes).toHaveLength(3)

    const existingFromOtherTenant = database({
      ownerId: userId,
      currentAt: new Date("2026-09-27T00:00:00Z"),
      purchaseTenantId: secondTenantId,
      memberTenants: [tenantId, secondTenantId],
    })
    expect(
      await applyVerifiedMobileAppAccess(
        { evidence, expectedUserId: userId, expectedTenantId: secondTenantId },
        existingFromOtherTenant.prisma
      )
    ).toMatchObject({ applied: true, userId })

    const outsider = database()
    await expect(
      applyVerifiedMobileAppAccess(
        { evidence, expectedUserId: userId, expectedTenantId: secondTenantId },
        outsider.prisma
      )
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" })
    expect(outsider.writes).toHaveLength(0)
  })

  test("reconciles a verified known store chain after login revocation without reopening client verification", async () => {
    const revoked = database({
      deleted: true,
      ownerId: userId,
      currentAt: new Date("2026-09-27T00:00:00Z"),
    })
    expect(
      await applyVerifiedMobileAppAccess(
        {
          evidence: {
            ...evidence,
            status: "suspended",
            verifiedAt: new Date("2026-09-29T00:00:00Z"),
          },
        },
        revoked.prisma
      )
    ).toMatchObject({ applied: true, userId })
    expect(revoked.writes).toHaveLength(3)
    expect(revoked.writes[0]).toMatchObject({
      data: { status: "suspended" },
    })
    expect(revoked.writes[2]).toMatchObject({
      data: {
        actorUserId: null,
        metadata: { reconciledAfterAccessRevocation: true },
      },
    })

    for (const scope of [
      { actorUserId: userId },
      { expectedUserId: userId },
      { expectedTenantId: tenantId },
    ]) {
      const client = database({ deleted: true, ownerId: userId })
      await expect(
        applyVerifiedMobileAppAccess({ evidence, ...scope }, client.prisma)
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" })
      expect(client.writes).toHaveLength(0)
    }
  })

  test("requires a same-user, same-environment chain for post-revocation store notices", async () => {
    for (const db of [
      database({ deleted: true }),
      database({ deleted: true, previousOwnerId: "another-user" }),
      database({
        deleted: true,
        previousOwnerId: userId,
        previousEnvironment: "sandbox",
      }),
    ]) {
      await expect(
        applyVerifiedMobileAppAccess(
          {
            evidence: {
              ...evidence,
              previousProviderSubscriptionId: "previous",
            },
          },
          db.prisma
        )
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" })
      expect(db.writes).toHaveLength(0)
    }

    const linked = database({ deleted: true, previousOwnerId: userId })
    expect(
      await applyVerifiedMobileAppAccess(
        {
          evidence: {
            ...evidence,
            previousProviderSubscriptionId: "previous",
          },
        },
        linked.prisma
      )
    ).toMatchObject({ applied: true, userId })
    expect(linked.writes).toHaveLength(3)
  })

  test("allows only a current paid or grace period", async () => {
    const db = database()
    const snapshot = await getMobileAppAccessSnapshot(
      { userId, environment: "production", now: verifiedAt },
      db.prisma
    )
    expect(snapshot.accessAllowed).toBe(true)
    expect(snapshot.accessEndsAt).toEqual(evidence.periodEndsAt)
    const revoked = await getMobileAppAccessSnapshot(
      { userId, environment: "production", now: verifiedAt },
      database({ deleted: true }).prisma
    )
    expect(revoked).toMatchObject({
      accessAllowed: false,
      status: "unsubscribed",
      periodEndsAt: null,
    })
    expect(
      mobileAppAccessAllowed(
        { status: "active", periodEndsAt: verifiedAt, graceEndsAt: null },
        verifiedAt
      )
    ).toBe(false)
    expect(
      mobileAppAccessAllowed(
        {
          status: "grace",
          periodEndsAt: verifiedAt,
          graceEndsAt: new Date("2026-09-29"),
        },
        verifiedAt
      )
    ).toBe(true)
    expect(
      mobileAppAccessAllowed(
        {
          status: "suspended",
          periodEndsAt: evidence.periodEndsAt,
          graceEndsAt: null,
        },
        verifiedAt
      )
    ).toBe(false)
  })
})
