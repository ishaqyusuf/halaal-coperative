import { describe, expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import { listPendingStoreRefundReviews } from "./store-refund-reviews"

const firstId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const event = {
  id: firstId,
  tenantId: null,
  occurredAt: new Date("2026-09-28T10:25:24.000Z"),
  createdAt: new Date("2026-09-28T10:31:00.000Z"),
  updatedAt: new Date("2026-09-28T10:33:00.000Z"),
  attempts: 3,
  payload: {
    orderId: "GPA.1234-5678",
    refundReason: 7,
    obfuscatedAccountId: "ff53e47b-d995-45a2-bbf6-79abb5750ccd",
    receivedAt: "2026-09-28T10:31:00.000Z",
    reviewBy: "2026-09-29T10:25:24.000Z",
    tokenDigest: "secret-digest",
    encryptedToken: {
      keyId: "key-1",
      ciphertext: "private-ciphertext",
      iv: "private-iv",
      tag: "private-tag",
    },
  },
}

describe("platform refund-review queue", () => {
  test("requires an active platform owner before querying private events", async () => {
    let queried = false
    const db = {
      user: { findFirst: async () => null },
      subscriptionProviderEvent: {
        findMany: async () => {
          queried = true
          return [event]
        },
      },
    } as unknown as PrismaClient
    await expect(
      listPendingStoreRefundReviews({ actorUserId: firstId }, db)
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" })
    expect(queried).toBe(false)
  })

  test("returns bounded deadline metadata without token or ciphertext", async () => {
    const queries: unknown[] = []
    const db = {
      user: { findFirst: async () => ({ id: firstId }) },
      subscriptionProviderEvent: {
        findMany: async (query: unknown) => {
          queries.push(query)
          return [event]
        },
      },
    } as unknown as PrismaClient
    const result = await listPendingStoreRefundReviews(
      { actorUserId: firstId },
      db
    )
    expect(Number.isFinite(Date.parse(result.asOf))).toBe(true)
    expect(result.data).toEqual([
      {
        id: firstId,
        tenantId: null,
        occurredAt: event.occurredAt,
        createdAt: event.createdAt,
        orderId: "GPA.1234-5678",
        refundReason: 7,
        accountBinding: "ff53e47b-d995-45a2-bbf6-79abb5750ccd",
        receivedAt: "2026-09-28T10:31:00.000Z",
        reviewBy: "2026-09-29T10:25:24.000Z",
        trackedDeliveries: 3,
        lastObservedAt: event.updatedAt,
      },
    ])
    expect(JSON.stringify(result)).not.toContain("private-ciphertext")
    expect(JSON.stringify(result)).not.toContain("secret-digest")
    expect(JSON.stringify(result)).not.toContain("private-review-token")
    expect(queries[0]).toMatchObject({
      where: {
        providerName: "google_play",
        eventType: "pending_refund_review.received",
        status: "received",
      },
      take: 31,
    })
  })

  test("labels legacy receipts without counted deliveries as unknown", async () => {
    const db = {
      user: { findFirst: async () => ({ id: firstId }) },
      subscriptionProviderEvent: {
        findMany: async () => [{ ...event, attempts: 0 }],
      },
    } as unknown as PrismaClient
    const result = await listPendingStoreRefundReviews(
      { actorUserId: firstId },
      db
    )
    expect(result.data[0]).toMatchObject({
      trackedDeliveries: null,
      lastObservedAt: null,
    })
  })

  test("uses a stable cursor and rejects malformed cursors", async () => {
    const queries: unknown[] = []
    const rows = Array.from({ length: 31 }, (_, index) => ({
      ...event,
      id: `${String(index).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    }))
    const db = {
      user: { findFirst: async () => ({ id: firstId }) },
      subscriptionProviderEvent: {
        findMany: async (query: unknown) => {
          queries.push(query)
          return rows
        },
      },
    } as unknown as PrismaClient
    const first = await listPendingStoreRefundReviews(
      { actorUserId: firstId },
      db
    )
    expect(first.data).toHaveLength(30)
    expect(first.meta.cursor).toBeTruthy()
    await listPendingStoreRefundReviews(
      { actorUserId: firstId, cursor: first.meta.cursor },
      db
    )
    expect(queries[1]).toMatchObject({ where: { OR: expect.any(Array) } })
    await expect(
      listPendingStoreRefundReviews(
        { actorUserId: firstId, cursor: "not-a-cursor" },
        db
      )
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" })
  })
})
