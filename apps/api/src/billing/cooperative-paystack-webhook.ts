import { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import { captureApiError } from "../observability/sentry"
import {
  cooperativePaystackConfig,
  cooperativePaystackReference,
  reconcileCooperativePaystackCheckout,
} from "./cooperative-paystack"

function digestMatches(expected: Buffer, signature: string) {
  return (
    /^[a-f\d]{128}$/i.test(signature) &&
    timingSafeEqual(expected, Buffer.from(signature, "hex"))
  )
}

export function verifyPaystackWebhookSignature(
  body: Buffer,
  headers: Headers,
  config: { secret: string; signingSecret?: string },
  now = Math.floor(Date.now() / 1_000)
) {
  const modern = headers.get("paystack-signature")
  if (modern !== null) {
    if (!config.signingSecret?.startsWith("whsec_")) return false
    const entries = modern.split(",").map((part) => part.trim())
    const timestamps = entries.filter((part) => part.startsWith("t="))
    const timestamp = timestamps[0]?.slice(2)
    if (
      timestamps.length !== 1 ||
      !timestamp ||
      !/^\d+$/.test(timestamp) ||
      Math.abs(now - Number(timestamp)) > 300
    )
      return false

    const expected = createHmac("sha512", config.signingSecret)
      .update(`${timestamp}.`)
      .update(body)
      .digest()
    return entries.some((entry) => {
      const signature = /^v1=whk_[^:]+:(.+)$/.exec(entry)?.[1]
      return signature ? digestMatches(expected, signature) : false
    })
  }

  const legacy = headers.get("x-paystack-signature")
  return Boolean(
    legacy &&
    digestMatches(
      createHmac("sha512", config.secret).update(body).digest(),
      legacy
    )
  )
}

const eventEnvelope = z.object({ event: z.string(), data: z.unknown() })
const transactionEvent = z.object({ reference: z.string() })

export const handleCooperativePaystackWebhook = new Hono().post(
  "/api/billing/webhooks/paystack",
  bodyLimit({ maxSize: 256 * 1024 }),
  async (c) => {
    const config = cooperativePaystackConfig()
    if (!config) return c.body(null, 503)

    const body = Buffer.from(await c.req.arrayBuffer())
    if (!verifyPaystackWebhookSignature(body, c.req.raw.headers, config))
      return c.body(null, 401)

    let payload: unknown
    try {
      payload = JSON.parse(body.toString("utf8"))
    } catch {
      return c.body(null, 400)
    }
    const event = eventEnvelope.safeParse(payload)
    if (!event.success) return c.body(null, 400)
    if (event.data.event !== "charge.success") return c.body(null, 200)
    const transaction = transactionEvent.safeParse(event.data.data)
    if (!transaction.success) return c.body(null, 400)
    const reference = cooperativePaystackReference.safeParse(
      transaction.data.reference
    )
    if (!reference.success) return c.body(null, 200)

    try {
      const status = await reconcileCooperativePaystackCheckout(config, {
        reference: reference.data,
      })
      return c.body(
        null,
        status === "paid" || status === "unavailable" ? 200 : 503
      )
    } catch (error) {
      captureApiError(error, { method: "POST" })
      return c.body(null, 503)
    }
  }
)
