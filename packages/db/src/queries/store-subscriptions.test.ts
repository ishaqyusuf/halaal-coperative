import { describe, expect, it } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import {
  applyVerifiedStoreEntitlement,
  isActiveQaStoreTenant,
  type VerifiedStoreEntitlement,
} from "./store-subscriptions"
const evidence: VerifiedStoreEntitlement = {
  accountBinding: "subscription-a",
  productId: "starter",
  planCode: "starter",
  providerName: "apple_app_store",
  providerSubscriptionId: "original-a",
  periodStartsAt: new Date("2026-09-01"),
  periodEndsAt: new Date("2026-10-01"),
  graceEndsAt: null,
  status: "active",
  cancelAtPeriodEnd: false,
  verifiedAt: new Date("2026-09-24"),
  environment: "production",
}
function database(
  options: {
    tenantId?: string
    existingProvider?: string
    existingChain?: string
    existingEnd?: Date
    lastVerified?: Date
    qa?: boolean
    actor?: boolean
    event?: boolean
    ownerId?: string
    replacementLink?: boolean
  } = {}
) {
  const writes: unknown[] = []
  const events: unknown[] = []
  const linkLookups: unknown[] = []
  let transactionOptions: unknown
  const current = {
    id: evidence.accountBinding,
    tenantId: options.tenantId ?? "tenant-a",
    providerName: options.existingProvider ?? null,
    providerSubscriptionId: options.existingChain ?? null,
    currentPeriodEndsAt: options.existingEnd ?? null,
    lastProviderEventAt: options.lastVerified ?? null,
  }
  const tx = {
    tenantSubscription: {
      findUnique: async (args: { where: { id?: string } }) =>
        args.where.id
          ? current
          : options.ownerId
            ? { id: options.ownerId }
            : null,
      update: async (value: unknown) => {
        writes.push(value)
        return current
      },
    },
    tenant: {
      findUnique: async () => ({
        qaSourceDomain: options.qa ? "qa.test" : null,
        qaPurgeStartedAt: null,
        dataClassification: options.qa ? "qa" : "live",
      }),
    },
    user: {
      findFirst: async () => (options.actor === false ? null : { id: "actor" }),
    },
    subscriptionPlan: {
      findUnique: async () => ({ id: "plan-a", isActive: true }),
    },
    subscriptionProviderEvent: {
      findUnique: async () =>
        options.event ? { tenantId: current.tenantId } : null,
      findFirst: async (value: unknown) => {
        linkLookups.push(value)
        return options.replacementLink ? { id: "replacement-event" } : null
      },
      create: async (value: unknown) => {
        events.push(value)
      },
    },
    auditLog: { create: async () => ({}) },
  }
  const prisma = {
    $transaction: async (fn: (v: typeof tx) => unknown, opts: unknown) => {
      transactionOptions = opts
      return fn(tx)
    },
  } as unknown as PrismaClient
  return {
    prisma,
    writes,
    events,
    linkLookups,
    options: () => transactionOptions,
  }
}
describe("verified store persistence", () => {
  it("offers sandbox products only to active classified QA tenants", async () => {
    for (const [tenant, expected] of [
      [
        {
          dataClassification: "qa",
          qaSourceDomain: "store-qa.test",
          qaPurgeStartedAt: null,
        },
        true,
      ],
      [
        {
          dataClassification: "live",
          qaSourceDomain: null,
          qaPurgeStartedAt: null,
        },
        false,
      ],
      [
        {
          dataClassification: "qa",
          qaSourceDomain: null,
          qaPurgeStartedAt: null,
        },
        false,
      ],
      [
        {
          dataClassification: "qa",
          qaSourceDomain: "store-qa.test",
          qaPurgeStartedAt: new Date(),
        },
        false,
      ],
      [null, false],
    ] as const) {
      const prisma = {
        tenant: { findUnique: async () => tenant },
      } as unknown as PrismaClient
      expect(await isActiveQaStoreTenant("tenant-a", prisma)).toBe(expected)
    }
  })
  it("rejects cross-tenant purchases without writes", async () => {
    const db = database()
    await expect(
      applyVerifiedStoreEntitlement(
        { evidence, expectedTenantId: "tenant-b" },
        db.prisma
      )
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" })
    expect(db.writes).toHaveLength(0)
  })
  it("rejects foreign chain ownership and revoked administrator authority", async () => {
    for (const options of [
      { ownerId: "another-subscription" },
      { actor: false },
    ]) {
      const db = database(options)
      await expect(
        applyVerifiedStoreEntitlement(
          { evidence, expectedTenantId: "tenant-a", actorUserId: "actor" },
          db.prisma
        )
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" })
      expect(db.writes).toHaveLength(0)
    }
  })
  it("prevents switching away from another provider or an unexpired chain", async () => {
    for (const options of [
      { existingProvider: "web_provider" },
      {
        existingProvider: "apple_app_store",
        existingChain: "newer-chain",
        existingEnd: new Date("2026-11-01"),
      },
    ]) {
      const db = database(options)
      await expect(
        applyVerifiedStoreEntitlement({ evidence }, db.prisma)
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" })
      expect(db.writes).toHaveLength(0)
    }
  })
  it("ignores a late suspended old-token event after a Google deferred replacement", async () => {
    const db = database({
      existingProvider: "google_play",
      existingChain: "new-token",
      existingEnd: new Date("2026-10-01"),
      replacementLink: true,
    })
    const oldToken: VerifiedStoreEntitlement = {
      ...evidence,
      providerName: "google_play",
      providerSubscriptionId: "old-token",
      status: "suspended",
    }
    expect(
      await applyVerifiedStoreEntitlement({ evidence: oldToken }, db.prisma)
    ).toEqual({
      applied: false,
      tenantId: "tenant-a",
      subscriptionId: evidence.accountBinding,
    })
    expect(db.writes).toHaveLength(0)
    expect(db.events).toHaveLength(0)
    expect(db.linkLookups[0]).toMatchObject({
      where: {
        tenantId: "tenant-a",
        providerName: "google_play",
        status: "applied",
        payload: {
          path: ["previousProviderSubscriptionId"],
          equals: "old-token",
        },
      },
    })
    const unrelated = database({
      existingProvider: "google_play",
      existingChain: "new-token",
      existingEnd: new Date("2026-10-01"),
    })
    await expect(
      applyVerifiedStoreEntitlement({ evidence: oldToken }, unrelated.prisma)
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" })
    expect(unrelated.writes).toHaveLength(0)
  })
  it("records the verified Google token link in a private provider event", async () => {
    const db = database({
      existingProvider: "google_play",
      existingChain: "old-token",
      existingEnd: new Date("2026-10-01"),
    })
    const linked: VerifiedStoreEntitlement = {
      ...evidence,
      providerName: "google_play",
      providerSubscriptionId: "new-token",
      previousProviderSubscriptionId: "old-token",
      periodStartsAt: new Date("2026-09-24"),
    }
    expect(
      (await applyVerifiedStoreEntitlement({ evidence: linked }, db.prisma))
        .applied
    ).toBe(true)
    expect(db.events).toHaveLength(1)
    expect(db.events[0]).toMatchObject({
      data: {
        payload: {
          providerSubscriptionId: "new-token",
          previousProviderSubscriptionId: "old-token",
        },
      },
    })
  })
  it("still applies suspension for the current Google token", async () => {
    const db = database({
      existingProvider: "google_play",
      existingChain: "current-token",
      replacementLink: true,
    })
    const currentToken: VerifiedStoreEntitlement = {
      ...evidence,
      providerName: "google_play",
      providerSubscriptionId: "current-token",
      status: "suspended",
    }
    expect(
      (
        await applyVerifiedStoreEntitlement(
          { evidence: currentToken },
          db.prisma
        )
      ).applied
    ).toBe(true)
    expect(db.writes).toHaveLength(1)
    expect(db.writes[0]).toMatchObject({ data: { status: "suspended" } })
  })
  it("does not store Google's original grant date as the current renewal start", async () => {
    const google = database()
    const originalGrant = new Date("2026-01-01")
    await applyVerifiedStoreEntitlement(
      {
        evidence: {
          ...evidence,
          providerName: "google_play",
          providerSubscriptionId: "google-token",
          periodStartsAt: originalGrant,
        },
      },
      google.prisma
    )
    expect(google.writes[0]).toMatchObject({
      data: {
        currentPeriodStartsAt: null,
        currentPeriodEndsAt: evidence.periodEndsAt,
      },
    })

    const apple = database()
    await applyVerifiedStoreEntitlement({ evidence }, apple.prisma)
    expect(apple.writes[0]).toMatchObject({
      data: { currentPeriodStartsAt: evidence.periodStartsAt },
    })
  })
  it("never grants sandbox purchases to a live cooperative", async () => {
    const db = database()
    await expect(
      applyVerifiedStoreEntitlement(
        { evidence: { ...evidence, environment: "sandbox" } },
        db.prisma
      )
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" })
    expect(db.writes).toHaveLength(0)
  })
  it("ignores older verification and deduplicates evidence", async () => {
    const stale = database({ lastVerified: new Date("2026-09-25") })
    expect(
      (await applyVerifiedStoreEntitlement({ evidence }, stale.prisma)).applied
    ).toBe(false)
    expect(stale.writes).toHaveLength(0)
    const repeated = database({ event: true })
    await applyVerifiedStoreEntitlement({ evidence }, repeated.prisma)
    expect(repeated.writes).toHaveLength(1)
    expect(repeated.events).toHaveLength(0)
    expect(repeated.options()).toEqual({ isolationLevel: "Serializable" })
  })
  it("retries distinct provider states verified in the same millisecond", async () => {
    const conflicting = database({ lastVerified: evidence.verifiedAt })
    await expect(
      applyVerifiedStoreEntitlement({ evidence }, conflicting.prisma)
    ).rejects.toMatchObject({ code: "CONFLICT" })
    expect(conflicting.writes).toHaveLength(0)
    expect(conflicting.events).toHaveLength(0)
    expect(
      (
        await applyVerifiedStoreEntitlement(
          {
            evidence: {
              ...evidence,
              verifiedAt: new Date(evidence.verifiedAt.getTime() + 1),
            },
          },
          conflicting.prisma
        )
      ).applied
    ).toBe(true)
    expect(conflicting.writes).toHaveLength(1)

    const duplicate = database({
      lastVerified: evidence.verifiedAt,
      event: true,
    })
    expect(
      await applyVerifiedStoreEntitlement({ evidence }, duplicate.prisma)
    ).toEqual({
      applied: false,
      tenantId: "tenant-a",
      subscriptionId: evidence.accountBinding,
    })
    expect(duplicate.writes).toHaveLength(0)
  })
})
