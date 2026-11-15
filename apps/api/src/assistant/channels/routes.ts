import { createPrismaAssistantChannelStore } from "@halaalvest/db"
import type { Hono } from "hono"
import { readAssistantChannelConfig } from "./config"
import { createAssistantChannelJobDispatch } from "./dispatch"
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

/**
 * Process-wide runtime backed by Prisma and the real provider senders. Built
 * on the first channel request, so other routes never pay for it.
 */
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
    // The turn module loads on first use, so the webhook stays small.
    runTurn: async (principal, input) =>
      (turnRunner ?? (await import("../turn")).runAssistantTurn)(
        principal,
        input
      ),
    // Trigger.dev when configured; otherwise in process (local API).
    dispatch: createAssistantChannelJobDispatch(),
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

const noStore = { "Cache-Control": "no-store" }

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: noStore })
}

function text(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { ...noStore, "Content-Type": "text/plain; charset=UTF-8" },
  })
}

/**
 * Telegram webhook. 404 while the flag is off; the secret header is checked
 * before the body is read. An event is acknowledged only after it is durably
 * admitted (and, with jobs, dispatched); a failure answers 503 so Telegram
 * retries, and retries dedupe.
 */
export async function handleTelegramWebhook(
  request: Request,
  runtime: AssistantChannelRuntime
) {
  const telegram = runtime.config().telegram
  if (!telegram) return json({ code: "NOT_FOUND" }, 404)
  if (
    !safeEqual(
      request.headers.get("x-telegram-bot-api-secret-token"),
      telegram.webhookSecret
    )
  )
    return json({ code: "UNAUTHORIZED" }, 401)
  const bytes = await readBoundedBytes(request, TELEGRAM_MAX_BYTES)
  if (!bytes) return json({ code: "PAYLOAD_TOO_LARGE" }, 413)
  const body = parseJson(bytes)
  if (!body.ok) return json({ code: "BAD_REQUEST" }, 400)
  const event = parseTelegramUpdate(body.value, telegram.botUsername)
  if (!event) return json({ ok: true }, 200)
  try {
    await runtime.admit(event)
  } catch {
    return json({ code: "CHANNEL_UNAVAILABLE" }, 503)
  }
  await runtime.acknowledgeCallback(event)
  return json({ ok: true }, 200)
}

/** WhatsApp verify handshake (`hub.mode=subscribe` + verify token). */
export function handleWhatsAppVerification(
  request: Request,
  runtime: AssistantChannelRuntime
) {
  const whatsapp = runtime.config().whatsapp
  if (!whatsapp) return text("Not found", 404)
  const challenge = verifyWhatsAppChallenge(
    new URL(request.url).searchParams,
    whatsapp.verifyToken
  )
  return challenge ? text(challenge, 200) : text("Unauthorized", 401)
}

/**
 * WhatsApp webhook. 404 while the flag is off. `X-Hub-Signature-256` is
 * verified over the exact raw bytes before anything is parsed.
 */
export async function handleWhatsAppWebhook(
  request: Request,
  runtime: AssistantChannelRuntime
) {
  const whatsapp = runtime.config().whatsapp
  if (!whatsapp) return text("Not found", 404)
  const bytes = await readBoundedBytes(request, WHATSAPP_MAX_BYTES)
  if (!bytes) return text("Event too large", 413)
  if (
    !verifyMetaSignature({
      appSecret: whatsapp.appSecret,
      rawBody: bytes,
      signature: request.headers.get("x-hub-signature-256"),
    })
  )
    return text("Unauthorized", 401)
  const body = parseJson(bytes)
  if (!body.ok) return text("Invalid event", 400)
  const events = parseWhatsAppEvents(body.value, whatsapp.phoneNumberId)
  if (events.length > WHATSAPP_MAX_EVENTS)
    return text("Too many events", 413)
  try {
    for (const event of events) await runtime.admit(event)
  } catch {
    return text("Temporarily unavailable", 503)
  }
  return text("OK", 200)
}

/**
 * Mounts the webhooks on the local Hono API. The deployed dashboard serves
 * the same handlers as Next.js routes (`next-routes.ts`).
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

  app.post(TELEGRAM_WEBHOOK_PATH, (c) =>
    handleTelegramWebhook(c.req.raw, runtime())
  )
  app.get(WHATSAPP_WEBHOOK_PATH, (c) =>
    handleWhatsAppVerification(c.req.raw, runtime())
  )
  app.post(WHATSAPP_WEBHOOK_PATH, (c) =>
    handleWhatsAppWebhook(c.req.raw, runtime())
  )
}
