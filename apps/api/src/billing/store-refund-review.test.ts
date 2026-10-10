import { describe, expect, test } from "bun:test"
import type { recordSubscriptionProviderEvent } from "@halaalvest/db"
import {
  decryptPendingRefundToken,
  encryptPendingRefundToken,
  recordPendingRefundReview,
} from "./store-refund-review"

const firstKey = Buffer.alloc(32, 0x42).toString("base64")
const secondKey = Buffer.alloc(32, 0x43).toString("base64")

async function withReviewKeys(run: () => Promise<void>) {
  const previousKeys = process.env.STORE_REFUND_REVIEW_KEYS_JSON
  const previousActive = process.env.STORE_REFUND_REVIEW_ACTIVE_KEY_ID
  process.env.STORE_REFUND_REVIEW_KEYS_JSON = JSON.stringify({
    first: firstKey,
  })
  process.env.STORE_REFUND_REVIEW_ACTIVE_KEY_ID = "first"
  try {
    await run()
  } finally {
    if (previousKeys === undefined)
      delete process.env.STORE_REFUND_REVIEW_KEYS_JSON
    else process.env.STORE_REFUND_REVIEW_KEYS_JSON = previousKeys
    if (previousActive === undefined)
      delete process.env.STORE_REFUND_REVIEW_ACTIVE_KEY_ID
    else process.env.STORE_REFUND_REVIEW_ACTIVE_KEY_ID = previousActive
  }
}

describe("pending Google refund review receipt", () => {
  test("encrypts the review token and retains a decryptable key ID across rotation", async () => {
    await withReviewKeys(async () => {
      const sealed = encryptPendingRefundToken("private-review-token")
      expect(JSON.stringify(sealed)).not.toContain("private-review-token")
      expect(decryptPendingRefundToken(sealed)).toBe("private-review-token")
      process.env.STORE_REFUND_REVIEW_KEYS_JSON = JSON.stringify({
        first: firstKey,
        second: secondKey,
      })
      process.env.STORE_REFUND_REVIEW_ACTIVE_KEY_ID = "second"
      expect(decryptPendingRefundToken(sealed)).toBe("private-review-token")
      expect(encryptPendingRefundToken("next-token").keyId).toBe("second")
      expect(() =>
        decryptPendingRefundToken({
          ...sealed,
          ciphertext: Buffer.from("altered").toString("base64"),
        })
      ).toThrow()
    })
  })

  test("persists a deduplicated, encrypted receipt without the raw token", async () => {
    await withReviewKeys(async () => {
      const records: Parameters<typeof recordSubscriptionProviderEvent>[0][] =
        []
      const recordEvent = (async (input) => {
        records.push(input)
        return { duplicate: records.length > 1, event: {} } as Awaited<
          ReturnType<typeof recordSubscriptionProviderEvent>
        >
      }) satisfies typeof recordSubscriptionProviderEvent
      const input = {
        event: {
          pendingRefundToken: "private-review-token",
          orderId: "GPA.1234-5678",
          refundReason: 7,
          obfuscatedAccountId: "ff53e47b-d995-45a2-bbf6-79abb5750ccd",
        },
        occurredAt: new Date("2026-09-28T10:25:24.000Z"),
        receivedAt: new Date("2026-09-28T10:31:00.000Z"),
      }
      await recordPendingRefundReview(input, recordEvent)
      await recordPendingRefundReview(input, recordEvent)
      expect(records).toHaveLength(2)
      expect(records[0]?.providerEventId).toBe(records[1]?.providerEventId)
      expect(records[0]?.payloadHash).toBe(records[1]?.payloadHash)
      expect(JSON.stringify(records)).not.toContain("private-review-token")
      expect(records[0]?.tenantId).toBeUndefined()
      expect(records[0]?.payload).toMatchObject({
        orderId: "GPA.1234-5678",
        reviewBy: "2026-09-29T10:25:24.000Z",
      })
      const payload = records[0]?.payload as {
        encryptedToken: Parameters<typeof decryptPendingRefundToken>[0]
      }
      expect(decryptPendingRefundToken(payload.encryptedToken)).toBe(
        "private-review-token"
      )
    })
  })

  test("refuses to retain a token without an encryption key", async () => {
    await withReviewKeys(async () => {
      delete process.env.STORE_REFUND_REVIEW_ACTIVE_KEY_ID
      expect(() => encryptPendingRefundToken("private-review-token")).toThrow(
        "Refund review encryption is not configured"
      )
    })
  })
})
