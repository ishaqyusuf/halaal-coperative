import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"
import type { ChannelProvider } from "./config"

/** Telegram `start` payloads allow [A-Za-z0-9_-], up to 64 characters. */
export function createLinkNonce() {
  return randomBytes(18).toString("base64url")
}

export function isLinkNonce(value: string) {
  return /^[A-Za-z0-9_-]{16,64}$/.test(value)
}

/** Only this digest is stored; the nonce itself never reaches the database. */
export function linkNonceDigest(nonce: string) {
  return createHash("sha256").update(`assistant-link:v1:${nonce}`).digest("hex")
}

export function providerAccountDigest(
  provider: ChannelProvider,
  accountId: string
) {
  return createHash("sha256")
    .update(`assistant-account:v1:${provider}:${accountId}`)
    .digest("hex")
}

/**
 * Job concurrency key for one chat: a digest, so Trigger.dev never sees a
 * phone number or chat ID.
 */
export function chatQueueKey(provider: ChannelProvider, chatId: string) {
  const digest = createHash("sha256")
    .update(`assistant-chat:v1:${provider}:${chatId}`)
    .digest("hex")
  return `${provider}-${digest.slice(0, 32)}`
}

/** Shown in the app at confirmation, e.g. "Telegram ID ••••6789". */
export function maskProviderAccount(
  provider: ChannelProvider,
  accountId: string
) {
  const digits = accountId.replace(/\D/g, "")
  const tail = digits.slice(-4)
  return provider === "telegram"
    ? `Telegram ID ••••${tail}`
    : `+${digits.slice(0, 3)} ••• ••${tail}`
}

export function safeEqual(left: string | null | undefined, right: string) {
  if (!left) return false
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Meta `X-Hub-Signature-256`: HMAC-SHA256 of the exact raw body. */
export function verifyMetaSignature(input: {
  appSecret: string
  rawBody: Uint8Array
  signature: string | null
}) {
  if (!input.signature?.startsWith("sha256=")) return false
  const expected = `sha256=${createHmac("sha256", input.appSecret)
    .update(input.rawBody)
    .digest("hex")}`
  return safeEqual(input.signature, expected)
}

export function signMetaBody(appSecret: string, rawBody: string | Uint8Array) {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`
}
