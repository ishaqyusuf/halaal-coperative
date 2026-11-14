import { createPrismaAssistantChannelStore } from "@halaalvest/db"
import type { Hono } from "hono"
import { readAssistantChannelConfig } from "./config"
import { safeEqual, verifyMetaSignature } from "./identity"
import {
  type AssistantChannelRuntime,
  createAssistantChannelRuntime,
} from "./runtime"
import { createTelegramSender, parseTelegramUpdate } from "./telegram"
import type { AssistantTurnRunner } from "./types"
import {
  WHATSAPP_MAX_EVENTS,
  createWhatsAppSender,
  parseWhatsAppEvents,
  verifyWhatsAppChallenge,
} from "./whatsapp"

export const TELEGRAM_WEBHOOK_PATH = "/api/webhooks/assistant/telegram"
export const WHATSAPP_WEBHOOK_PATH = "/api/webhooks/assistant/whatsapp"
const TELEGRAM_MAX_BYTES = 64 * 1024
const WHATSAPP_MAX_BYTES = 1024 * 1024

let turnRunner: AssistantTurnRunner | undefined
let defaultRuntime: AssistantChannelRuntime | null = null

/** Process-wide runtime backed by Prisma and the real provider senders. */
export function getAssistantChannelRuntime() {
  defaultRuntime ??= createAssistantChannelRuntime({
    store: createPrismaAssistantChannelStore(),
    config: () => readAssistantChannelConfig(),
    sender: (provider, config) =>
      provider === "telegram"
        ? config.telegram
          ? createTelegramSender(config.telegram)
          : null
        : config.whatsapp
          ? createWhatsAppSender(config.whatsapp)
          : null,
    get runTurn() {
      return turnRunner
    },
    log: (event, detail) =>
      console.warn(`[assistant-channels] ${event}`, detail ?? {}),
  })
  return defaultRuntime
}

/** Bounded raw body read; signature checks need the exact bytes. */
async function readBoundedBytes(request: Request, maximum: number) {
  if (Number(request.headers.get("content-length")) > maximum) return null
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > maximum) {
        void reader.cancel().catch(() => undefined)
        return null
      }
      chunks.push(part.value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

function parseJson(bytes: Uint8Array) {
  try {
    return {
      ok: true as const,
      value: JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes)
      ) as unknown,
    }
  } catch {
    return { ok: false as const }
  }
}

/**
 * Mounts the Telegram and WhatsApp webhooks. Both answer 404 while their flag
 * is off. An event is acknowledged only after it is durably admitted; a store
 * failure answers 503 so the provider retries, and retries dedupe.
 */
export function registerAssistantChannelWebhooks(
  app: Hono,
  options: {
    runTurn?: AssistantTurnRunner
    runtime?: AssistantChannelRuntime
  } = {}
) {
  if (options.runTurn) turnRunner = options.runTurn
  const runtime = () => options.runtime ?? getAssistantChannelRuntime()
  const noStore = { "Cache-Control": "no-store" }

  app.post(TELEGRAM_WEBHOOK_PATH, async (c) => {
    const current = runtime()
    const telegram = current.config().telegram
    if (!telegram) return c.json({ code: "NOT_FOUND" }, 404, noStore)
    if (
      !safeEqual(
        c.req.header("x-telegram-bot-api-secret-token"),
        telegram.webhookSecret
      )
    )
      return c.json({ code: "UNAUTHORIZED" }, 401, noStore)
    const bytes = await readBoundedBytes(c.req.raw, TELEGRAM_MAX_BYTES)
    if (!bytes) return c.json({ code: "PAYLOAD_TOO_LARGE" }, 413, noStore)
    const body = parseJson(bytes)
    if (!body.ok) return c.json({ code: "BAD_REQUEST" }, 400, noStore)
    const event = parseTelegramUpdate(body.value, telegram.botUsername)
    if (!event) return c.json({ ok: true }, 200, noStore)
    try {
      await current.admit(event)
    } catch {
      return c.json({ code: "CHANNEL_UNAVAILABLE" }, 503, noStore)
    }
    await current.acknowledgeCallback(event)
    return c.json({ ok: true }, 200, noStore)
  })

  app.get(WHATSAPP_WEBHOOK_PATH, (c) => {
    const whatsapp = runtime().config().whatsapp
    if (!whatsapp) return c.text("Not found", 404, noStore)
    const challenge = verifyWhatsAppChallenge(
      new URL(c.req.url).searchParams,
      whatsapp.verifyToken
    )
    return challenge
      ? c.text(challenge, 200, noStore)
      : c.text("Unauthorized", 401, noStore)
  })

  app.post(WHATSAPP_WEBHOOK_PATH, async (c) => {
    const current = runtime()
    const whatsapp = current.config().whatsapp
    if (!whatsapp) return c.text("Not found", 404, noStore)
    const bytes = await readBoundedBytes(c.req.raw, WHATSAPP_MAX_BYTES)
    if (!bytes) return c.text("Event too large", 413, noStore)
    if (
      !verifyMetaSignature({
        appSecret: whatsapp.appSecret,
        rawBody: bytes,
        signature: c.req.header("x-hub-signature-256") ?? null,
      })
    )
      return c.text("Unauthorized", 401, noStore)
    const body = parseJson(bytes)
    if (!body.ok) return c.text("Invalid event", 400, noStore)
    const events = parseWhatsAppEvents(body.value, whatsapp.phoneNumberId)
    if (events.length > WHATSAPP_MAX_EVENTS)
      return c.text("Too many events", 413, noStore)
    try {
      for (const event of events) await current.admit(event)
    } catch {
      return c.text("Temporarily unavailable", 503, noStore)
    }
    return c.text("OK", 200, noStore)
  })
}
