import { describe, expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import {
  createSubscriptionCheckoutIntent,
  ensureTenantSubscription,
  getTenantSubscriptionSnapshot,
  recordSubscriptionProviderEvent,
  transitionTenantSubscription,
} from "./subscriptions"

const now = new Date("2026-08-11T12:00:00.000Z")

describe("subscription queries", () => {
  test("scopes checkout idempotency to the requesting tenant", async () => {
    let where: unknown
    const prisma = {
      subscriptionPlan: {
        findUnique: () => Promise.resolve({ isActive: true, isPublic: true }),
        upsert: () => Promise.resolve({}),
      },
      subscriptionCheckoutIntent: {
        upsert: (input: { where: unknown }) => {
          where = input.where
          return Promise.resolve({
            id: "intent-1",
            requestedPlanCode: "standard",
          })
        },
      },
      tenantSubscription: {
        findUnique: () =>
          Promise.resolve({ id: "subscription-1", plan: { code: "standard" } }),
      },
    } as unknown as PrismaClient

    await createSubscriptionCheckoutIntent(
      {
        idempotencyKey: "mobile-request-1",
        requestedPlanCode: "standard",
        tenantId: "tenant-a",
      },
      prisma
    )

    expect(where).toEqual({
      tenantId_idempotencyKey: {
        idempotencyKey: "mobile-request-1",
        tenantId: "tenant-a",
      },
    })
  })

  test("rejects checkout idempotency reuse for another plan", async () => {
    const prisma = {
      subscriptionCheckoutIntent: {
        upsert: () =>
          Promise.resolve({
            id: "intent-1",
            requestedPlanCode: "starter",
          }),
      },
      subscriptionPlan: {
        findUnique: () => Promise.resolve({ isActive: true, isPublic: true }),
        upsert: () => Promise.resolve({}),
      },
      tenantSubscription: {
        findUnique: () =>
          Promise.resolve({ id: "subscription-1", plan: { code: "standard" } }),
      },
    } as unknown as PrismaClient

    await expect(
      createSubscriptionCheckoutIntent(
        {
          idempotencyKey: "mobile-request-1",
          requestedPlanCode: "growth",
          tenantId: "tenant-a",
        },
        prisma
      )
    ).rejects.toMatchObject({ code: "CONFLICT" })
  })

  test("rejects a plan that is not publicly requestable", async () => {
    const prisma = {
      subscriptionPlan: {
        findUnique: () => Promise.resolve({ isActive: false, isPublic: true }),
        upsert: () => Promise.resolve({}),
      },
    } as unknown as PrismaClient

    await expect(
      createSubscriptionCheckoutIntent(
        {
          idempotencyKey: "mobile-request-2",
          requestedPlanCode: "growth",
          tenantId: "tenant-a",
        },
        prisma
      )
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
  })

  test("scopes subscription, usage, and invoices to the active tenant", async () => {
    const calls: Array<{ resource: string; where: unknown }> = []
    const prisma = {
      member: {
        count: ({ where }: { where: unknown }) => {
          calls.push({ resource: "member", where })
          return Promise.resolve(42)
        },
      },
      subscriptionInvoice: {
        findMany: ({ where }: { where: unknown }) => {
          calls.push({ resource: "invoice", where })
          return Promise.resolve([])
        },
      },
      tenantSubscription: {
        findUnique: ({ where }: { where: unknown }) => {
          calls.push({ resource: "subscription", where })
          return Promise.resolve({
            activeMemberLimitOverride: null,
            addons: [],
            cancelAtPeriodEnd: false,
            currentPeriodEndsAt: null,
            currentPeriodStartsAt: null,
            graceEndsAt: null,
            id: "subscription-1",
            plan: { code: "standard" },
            source: "manual",
            sourceState: null,
            status: "active",
            trialEndsAt: null,
            trialStartsAt: null,
            updatedAt: now,
          })
        },
      },
    } as unknown as PrismaClient

    const snapshot = await getTenantSubscriptionSnapshot(
      { now, tenantId: "tenant-a" },
      prisma
    )

    expect(snapshot.tenantId).toBe("tenant-a")
    expect(snapshot.usage.activeMemberCount).toBe(42)
    expect(calls).toEqual([
      { resource: "subscription", where: { tenantId: "tenant-a" } },
      {
        resource: "member",
        where: { status: "active", tenantId: "tenant-a" },
      },
      { resource: "invoice", where: { tenantId: "tenant-a" } },
    ])
  })

  test("starts a provider receipt at one observed delivery", async () => {
    const prisma = {
      subscriptionProviderEvent: {
        create: ({ data }: { data: { attempts: number } }) => {
          expect(data.attempts).toBe(1)
          return Promise.resolve({ id: "provider-event-1", attempts: 1 })
        },
      },
    } as unknown as PrismaClient
    const result = await recordSubscriptionProviderEvent(
      {
        eventType: "pending_refund_review.received",
        occurredAt: now,
        payloadHash: "sha256:abc",
        providerEventId: "event-1",
        providerName: "google_play",
      },
      prisma
    )
    expect(result).toMatchObject({
      duplicate: false,
      event: { attempts: 1 },
    })
  })

  test("treats a repeated provider event as an idempotent duplicate", async () => {
    const existing = {
      id: "provider-event-1",
      payloadHash: "sha256:abc",
      tenantId: "tenant-a",
      attempts: 1,
    }
    const redelivered = { ...existing, attempts: 2 }
    const prisma = {
      subscriptionProviderEvent: {
        create: () => Promise.reject({ code: "P2002" }),
        findUniqueOrThrow: () => Promise.resolve(existing),
        update: ({ data }: { data: { attempts: { increment: number } } }) => {
          expect(data).toEqual({ attempts: { increment: 1 } })
          return Promise.resolve(redelivered)
        },
      },
    } as unknown as PrismaClient

    const result = await recordSubscriptionProviderEvent(
      {
        eventType: "invoice.paid",
        occurredAt: now,
        payloadHash: "sha256:abc",
        providerEventId: "event-1",
        providerName: "provider",
        tenantId: "tenant-a",
      },
      prisma
    )

    expect(result).toEqual({ duplicate: true, event: redelivered })
  })

  test("rejects a duplicate provider event with conflicting evidence", async () => {
    const prisma = {
      subscriptionProviderEvent: {
        create: () => Promise.reject({ code: "P2002" }),
        findUniqueOrThrow: () =>
          Promise.resolve({
            id: "provider-event-1",
            payloadHash: "sha256:different",
            tenantId: "tenant-b",
          }),
      },
    } as unknown as PrismaClient

    await expect(
      recordSubscriptionProviderEvent(
        {
          eventType: "invoice.paid",
          occurredAt: now,
          payloadHash: "sha256:abc",
          providerEventId: "event-1",
          providerName: "provider",
          tenantId: "tenant-a",
        },
        prisma
      )
    ).rejects.toMatchObject({ code: "CONFLICT" })
  })

  test("initializes Free Beta with durable audit evidence", async () => {
    const auditEvents: unknown[] = []
    const provisionedAt = new Date("2026-08-29T12:00:00Z")
    let createData: Record<string, unknown> | null = null
    const createdSubscription = {
      addons: [],
      id: "subscription-1",
      plan: { code: "free_beta" },
      tenantId: "tenant-a",
    }
    const transaction = {
      auditLog: {
        create: ({ data }: { data: unknown }) => {
          auditEvents.push(data)
          return Promise.resolve(data)
        },
      },
      tenantSubscription: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          createData = data
          return Promise.resolve(createdSubscription)
        },
        findUnique: () => Promise.resolve(null),
      },
    }
    const prisma = {
      $transaction: (callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      subscriptionPlan: {
        findUnique: () => Promise.resolve({ id: "plan-free-beta" }),
        upsert: () => Promise.resolve({}),
      },
      tenant: {
        findUnique: () => Promise.resolve({ id: "tenant-a" }),
      },
      tenantSubscription: {
        findUnique: () => Promise.resolve(null),
      },
    } as unknown as PrismaClient

    const subscription = await ensureTenantSubscription(
      "tenant-a",
      prisma,
      provisionedAt
    )

    expect(subscription).toEqual(createdSubscription)
    expect(createData).toMatchObject({
      status: "free_beta",
      trialStartsAt: provisionedAt,
      trialEndsAt: new Date("2026-11-27T12:00:00Z"),
    })
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "subscription.initialized",
        actorType: "system",
        tenantId: "tenant-a",
      }),
    ])
  })

  test("reuses an outer transaction when provisioning Free Beta", async () => {
    const auditEvents: unknown[] = []
    const transaction = {
      auditLog: {
        create: ({ data }: { data: unknown }) => {
          auditEvents.push(data)
          return Promise.resolve(data)
        },
      },
      subscriptionPlan: {
        findUnique: () => Promise.resolve({ id: "plan-free-beta" }),
        upsert: () => Promise.resolve({}),
      },
      tenant: {
        findUnique: () => Promise.resolve({ id: "tenant-a" }),
      },
      tenantSubscription: {
        create: () =>
          Promise.resolve({
            addons: [],
            id: "subscription-outer-tx",
            plan: { code: "free_beta" },
            tenantId: "tenant-a",
          }),
        findUnique: () => Promise.resolve(null),
      },
    } as unknown as PrismaClient

    const subscription = await ensureTenantSubscription("tenant-a", transaction)

    expect(subscription).toMatchObject({ id: "subscription-outer-tx" })
    expect(auditEvents).toHaveLength(1)
  })

  test("persists and audits time-driven grace reconciliation once", async () => {
    const auditEvents: unknown[] = []
    const expired = {
      activeMemberLimitOverride: null,
      addons: [],
      cancelAtPeriodEnd: false,
      currentPeriodEndsAt: null,
      currentPeriodStartsAt: null,
      graceEndsAt: new Date("2026-08-18T12:00:00.000Z"),
      id: "subscription-1",
      plan: { code: "free_beta" },
      source: "free_beta",
      sourceState: null,
      status: "free_beta",
      tenantId: "tenant-a",
      trialEndsAt: new Date("2026-08-10T12:00:00.000Z"),
      trialStartsAt: new Date("2026-05-10T12:00:00.000Z"),
      updatedAt: now,
    }
    const reconciled = { ...expired, status: "grace" }
    const transaction = {
      auditLog: {
        create: ({ data }: { data: unknown }) => {
          auditEvents.push(data)
          return Promise.resolve(data)
        },
      },
      tenantSubscription: {
        findUniqueOrThrow: () => Promise.resolve(reconciled),
        updateMany: () => Promise.resolve({ count: 1 }),
      },
    }
    const prisma = {
      $transaction: (callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      member: { count: () => Promise.resolve(20) },
      subscriptionInvoice: { findMany: () => Promise.resolve([]) },
      tenantSubscription: { findUnique: () => Promise.resolve(expired) },
    } as unknown as PrismaClient

    const snapshot = await getTenantSubscriptionSnapshot(
      { now, tenantId: "tenant-a" },
      prisma
    )

    expect(snapshot.status).toBe("grace")
    expect(snapshot.enforcement.canActivateMember).toBe(false)
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "subscription.lifecycle_reconciled",
        actorType: "system",
        metadata: expect.objectContaining({
          fromStatus: "free_beta",
          toStatus: "grace",
        }),
      }),
    ])
  })

  test("persists an audit event with every subscription transition", async () => {
    const auditEvents: unknown[] = []
    const transaction = {
      auditLog: {
        create: ({ data }: { data: unknown }) => {
          auditEvents.push(data)
          return Promise.resolve(data)
        },
      },
      subscriptionPlan: {
        findUnique: () => Promise.resolve({ id: "plan-standard" }),
      },
      tenantSubscription: {
        findUnique: () =>
          Promise.resolve({ planId: "plan-starter", status: "active" }),
        upsert: () =>
          Promise.resolve({ id: "subscription-1", status: "past_due" }),
      },
    }
    const prisma = {
      $transaction: (callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      subscriptionPlan: {
        upsert: () => Promise.resolve({}),
      },
    } as unknown as PrismaClient

    await transitionTenantSubscription(
      {
        actorUserId: "user-1",
        planCode: "standard",
        reason: "provider_invoice_failed",
        source: "billing_provider",
        status: "past_due",
        tenantId: "tenant-a",
      },
      prisma
    )

    expect(auditEvents).toHaveLength(1)
    expect(auditEvents[0]).toMatchObject({
      action: "subscription.transition",
      actorUserId: "user-1",
      tenantId: "tenant-a",
    })
  })
})
