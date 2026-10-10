import { describe, expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import { getMobileAppAccessSnapshot } from "./mobile-app-access"
import {
  issueMobileAppReviewGrant,
  revokeMobileAppReviewGrant,
} from "./mobile-app-review-grants"

const actorUserId = "11111111-1111-4111-8111-111111111111"
const reviewerUserId = "22222222-2222-4222-8222-222222222222"
const tenantId = "33333333-3333-4333-8333-333333333333"
const now = new Date("2026-09-29T12:00:00.000Z")
const expiresAt = new Date("2026-10-06T12:00:00.000Z")

function grantDb(
  options: {
    operator?: boolean
    qa?: boolean
    active?: boolean
    crossTenant?: boolean
    revoked?: boolean
  } = {}
) {
  const writes: { kind: string; data: unknown }[] = []
  const tx = {
    user: {
      findFirst: async () =>
        options.operator === false ? null : { id: actorUserId },
      findUnique: async () => ({
        id: reviewerUserId,
        tenantId,
        deletedAt: null,
        isPlatformOwner: false,
        tenant: {
          dataClassification: options.qa === false ? "live" : "qa",
          status: options.active === false ? "suspended" : "active",
          qaSourceDomain: "review.test",
          qaPurgeStartedAt: null,
        },
        memberships: [
          { tenantId },
          ...(options.crossTenant ? [{ tenantId: "another-tenant" }] : []),
        ],
      }),
    },
    mobileAppReviewGrant: {
      upsert: async (args: { create: unknown; update: unknown }) => {
        writes.push({ kind: "grant", data: args })
        return { id: "grant-id", expiresAt }
      },
      findUnique: async () => ({
        id: "grant-id",
        tenantId,
        revokedAt: options.revoked ? now : null,
      }),
      update: async (args: { data: unknown }) => {
        writes.push({ kind: "revoke", data: args.data })
        return {}
      },
    },
    auditLog: {
      create: async (args: { data: unknown }) => {
        writes.push({ kind: "audit", data: args.data })
        return {}
      },
    },
  }
  const prisma = {
    ...tx,
    $transaction: async (run: (value: typeof tx) => Promise<unknown>) =>
      run(tx),
  } as unknown as PrismaClient
  return { prisma, writes }
}

describe("personal app reviewer grant", () => {
  test("issues only to an isolated QA user and records a separate audit event", async () => {
    const valid = grantDb()
    expect(
      await issueMobileAppReviewGrant(
        {
          actorUserId,
          userId: reviewerUserId,
          environment: "production",
          expiresAt,
          reason: "Store reviewer feature inspection for synthetic data",
          now,
        },
        valid.prisma
      )
    ).toEqual({ grantId: "grant-id", expiresAt })
    expect(valid.writes.map((write) => write.kind)).toEqual(["grant", "audit"])
    expect(valid.writes[1]?.data).toMatchObject({
      action: "mobile_app_access.review_grant_issued",
      actorUserId,
    })
    for (const invalid of [
      grantDb({ operator: false }),
      grantDb({ qa: false }),
      grantDb({ active: false }),
      grantDb({ crossTenant: true }),
    ]) {
      await expect(
        issueMobileAppReviewGrant(
          {
            actorUserId,
            userId: reviewerUserId,
            environment: "production",
            expiresAt,
            reason: "Store reviewer feature inspection for synthetic data",
            now,
          },
          invalid.prisma
        )
      ).rejects.toThrow("Review access could not be changed")
      expect(invalid.writes).toEqual([])
    }
  })

  test("limits issue time and allows audited, idempotent revocation", async () => {
    const db = grantDb()
    await expect(
      issueMobileAppReviewGrant(
        {
          actorUserId,
          userId: reviewerUserId,
          environment: "production",
          expiresAt: new Date("2027-01-01T00:00:00.000Z"),
          reason: "Store reviewer feature inspection for synthetic data",
          now,
        },
        db.prisma
      )
    ).rejects.toThrow("Review access could not be changed")
    expect(db.writes).toEqual([])
    expect(
      await revokeMobileAppReviewGrant(
        { actorUserId, userId: reviewerUserId, now },
        db.prisma
      )
    ).toEqual({ revoked: true })
    expect(db.writes.map((write) => write.kind)).toEqual(["revoke", "audit"])
    const revoked = grantDb({ revoked: true })
    expect(
      await revokeMobileAppReviewGrant(
        { actorUserId, userId: reviewerUserId, now },
        revoked.prisma
      )
    ).toEqual({ revoked: false })
    expect(revoked.writes).toEqual([])
  })

  test("grants only the current QA tenant until expiry; unpaid account stays gated", async () => {
    let grant: Date | null = expiresAt
    const prisma = {
      mobileAppAccessPurchase: { findMany: async () => [] },
      mobileAppReviewGrant: {
        findFirst: async (query: {
          where: {
            tenantId: string
            environment: string
            expiresAt: { gt: Date }
            tenant: { status: string; dataClassification: string }
          }
        }) =>
          grant &&
          query.where.tenantId === tenantId &&
          query.where.environment === "production" &&
          query.where.tenant.status === "active" &&
          query.where.tenant.dataClassification === "qa" &&
          grant > query.where.expiresAt.gt
            ? { expiresAt: grant }
            : null,
      },
    } as unknown as PrismaClient
    const input = {
      userId: reviewerUserId,
      tenantId,
      environment: "production" as const,
      now,
    }
    expect(await getMobileAppAccessSnapshot(input, prisma)).toMatchObject({
      accessAllowed: true,
      status: "review_grant",
      accessEndsAt: expiresAt,
      providerName: null,
    })
    expect(
      (
        await getMobileAppAccessSnapshot(
          { ...input, tenantId: "other" },
          prisma
        )
      ).accessAllowed
    ).toBe(false)
    expect(
      (await getMobileAppAccessSnapshot({ ...input, now: expiresAt }, prisma))
        .accessAllowed
    ).toBe(false)
    grant = null
    expect(await getMobileAppAccessSnapshot(input, prisma)).toMatchObject({
      accessAllowed: false,
      status: "unsubscribed",
    })
  })
})
