import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import * as deliveryWorker from "./app/api/internal/assistant/channels/delivery/route"
import * as turnWorker from "./app/api/internal/assistant/channels/turn/route"
import * as telegram from "./app/api/webhooks/assistant/telegram/route"
import * as whatsapp from "./app/api/webhooks/assistant/whatsapp/route"
import { config } from "./proxy"

const CHANNEL_ENV = [
  "ASSISTANT_TELEGRAM_ENABLED",
  "ASSISTANT_TELEGRAM_BOT_TOKEN",
  "ASSISTANT_TELEGRAM_WEBHOOK_SECRET",
  "ASSISTANT_TELEGRAM_BOT_USERNAME",
  "ASSISTANT_WHATSAPP_ENABLED",
  "ASSISTANT_WHATSAPP_APP_SECRET",
  "ASSISTANT_WHATSAPP_VERIFY_TOKEN",
  "ASSISTANT_WHATSAPP_ACCESS_TOKEN",
  "ASSISTANT_WHATSAPP_PHONE_NUMBER_ID",
  "ASSISTANT_CHANNEL_WORKER_SECRET",
] as const

const saved = new Map<string, string | undefined>()

// Flags off: every channel variable unset, as in Preview and Production today.
beforeAll(() => {
  for (const key of CHANNEL_ENV) {
    saved.set(key, process.env[key])
    delete process.env[key]
  }
})
afterAll(() => {
  for (const [key, value] of saved)
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
})

const origin = "https://halaalvest-dash.localhost"

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

describe("assistant channel routes on the dashboard (flags off)", () => {
  test("Telegram webhook answers 404, even with a secret header", async () => {
    const response = await telegram.POST(
      post(
        "/api/webhooks/assistant/telegram",
        { update_id: 1 },
        { "x-telegram-bot-api-secret-token": "anything" }
      )
    )
    expect(response.status).toBe(404)
    expect(response.headers.get("cache-control")).toBe("no-store")
  })

  test("WhatsApp verify handshake and webhook answer 404", async () => {
    const verify = await whatsapp.GET(
      new Request(
        `${origin}/api/webhooks/assistant/whatsapp?hub.mode=subscribe&hub.verify_token=x&hub.challenge=123`
      )
    )
    expect(verify.status).toBe(404)
    const event = await whatsapp.POST(
      post(
        "/api/webhooks/assistant/whatsapp",
        { object: "whatsapp_business_account", entry: [] },
        { "x-hub-signature-256": "sha256=00" }
      )
    )
    expect(event.status).toBe(404)
  })

  test("channel worker routes answer 404 until their secret is set", async () => {
    const id = "6f1c2a8e-4b7d-4c1e-9a2b-3c4d5e6f7a8b"
    const headers = { "x-assistant-channel-worker-key": "anything" }
    expect(
      (
        await turnWorker.POST(
          post("/api/internal/assistant/channels/turn", { inboxId: id }, headers)
        )
      ).status
    ).toBe(404)
    expect(
      (
        await deliveryWorker.POST(
          post(
            "/api/internal/assistant/channels/delivery",
            { outboxId: id },
            headers
          )
        )
      ).status
    ).toBe(404)
  })

  test("routes run on Node with no caching", () => {
    for (const route of [telegram, whatsapp, turnWorker, deliveryWorker]) {
      expect(route.runtime).toBe("nodejs")
      expect(route.dynamic).toBe("force-dynamic")
    }
    // The job's request timeouts (130 s / 70 s) stay above these.
    expect(turnWorker.maxDuration).toBe(120)
    expect(deliveryWorker.maxDuration).toBe(60)
  })

  test("the tenant proxy skips the webhook and worker paths only", () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`)
    for (const path of [
      "/api/webhooks/assistant/telegram",
      "/api/webhooks/assistant/whatsapp",
      "/api/internal/assistant/channels/turn",
      "/api/internal/assistant/channels/delivery",
    ])
      expect(matcher.test(path)).toBe(false)
    for (const path of [
      "/",
      "/assistant",
      "/assistant/m/abc",
      "/api/trpc/assistant.bootstrap",
      "/api/assistant/turn",
      "/api/billing/webhooks/paystack",
      "/api/internal/mobile/builds",
    ])
      expect(matcher.test(path)).toBe(true)
  })
})
