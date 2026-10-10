import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"
import { recordSubscriptionProviderEvent } from "@halaalvest/db"

type PendingRefundReview = {
  pendingRefundToken: string
  orderId: string
  refundReason: number
  obfuscatedAccountId?: string
  obfuscatedProfileId?: string
}

type EncryptedToken = {
  keyId: string
  iv: string
  ciphertext: string
  tag: string
}

function reviewKeyring() {
  const activeKeyId = process.env.STORE_REFUND_REVIEW_ACTIVE_KEY_ID?.trim()
  const encoded = process.env.STORE_REFUND_REVIEW_KEYS_JSON
  if (!activeKeyId || !encoded)
    throw new Error("Refund review encryption is not configured")
  const keys: unknown = JSON.parse(encoded)
  if (!keys || typeof keys !== "object" || Array.isArray(keys))
    throw new Error("Refund review encryption is not configured")
  const value = (keys as Record<string, unknown>)[activeKeyId]
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value))
    throw new Error("Refund review encryption is not configured")
  const key = Buffer.from(value, "base64")
  if (key.length !== 32 || key.toString("base64") !== value)
    throw new Error("Refund review encryption is not configured")
  return { activeKeyId, key }
}

export function encryptPendingRefundToken(token: string): EncryptedToken {
  const { activeKeyId, key } = reviewKeyring()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ])
  return {
    keyId: activeKeyId,
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  }
}

export function decryptPendingRefundToken(value: EncryptedToken): string {
  const encoded = process.env.STORE_REFUND_REVIEW_KEYS_JSON
  if (!encoded) throw new Error("Refund review encryption is not configured")
  const keys: unknown = JSON.parse(encoded)
  if (!keys || typeof keys !== "object" || Array.isArray(keys))
    throw new Error("Refund review encryption is not configured")
  const keyValue = (keys as Record<string, unknown>)[value.keyId]
  if (typeof keyValue !== "string")
    throw new Error("Refund review encryption key is unavailable")
  const key = Buffer.from(keyValue, "base64")
  if (key.length !== 32 || key.toString("base64") !== keyValue)
    throw new Error("Refund review encryption key is unavailable")
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(value.iv, "base64")
  )
  decipher.setAuthTag(Buffer.from(value.tag, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8")
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export async function recordPendingRefundReview(
  input: {
    event: PendingRefundReview
    receivedAt: Date
    occurredAt: Date
  },
  recordEvent: typeof recordSubscriptionProviderEvent = recordSubscriptionProviderEvent
) {
  const { event, receivedAt, occurredAt } = input
  const tokenDigest = sha256(event.pendingRefundToken)
  const payloadHash = sha256(
    JSON.stringify({
      tokenDigest,
      orderId: event.orderId,
      refundReason: event.refundReason,
      obfuscatedAccountId: event.obfuscatedAccountId ?? null,
      obfuscatedProfileId: event.obfuscatedProfileId ?? null,
    })
  )
  const encryptedToken = encryptPendingRefundToken(event.pendingRefundToken)
  return recordEvent({
    providerName: "google_play",
    providerEventId: `pending_refund_review:${tokenDigest}`,
    eventType: "pending_refund_review.received",
    occurredAt,
    payloadHash,
    payload: {
      orderId: event.orderId,
      refundReason: event.refundReason,
      obfuscatedAccountId: event.obfuscatedAccountId ?? null,
      obfuscatedProfileId: event.obfuscatedProfileId ?? null,
      receivedAt: receivedAt.toISOString(),
      reviewBy: new Date(
        Math.min(receivedAt.getTime(), occurredAt.getTime()) +
          24 * 60 * 60 * 1000
      ).toISOString(),
      tokenDigest,
      encryptedToken,
    },
  })
}
