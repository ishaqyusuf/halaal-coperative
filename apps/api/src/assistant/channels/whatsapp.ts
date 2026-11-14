import { z } from "zod"
import type { WhatsAppChannelConfig } from "./config"
import { safeEqual } from "./identity"
import {
  type ChannelInbound,
  type ChannelMessage,
  ChannelSendError,
  type ChannelSender,
} from "./types"

export const WHATSAPP_MAX_EVENTS = 50

/** Cloud API GET handshake: echo the challenge only for our verify token. */
export function verifyWhatsAppChallenge(
  params: URLSearchParams,
  verifyToken: string
) {
  return params.get("hub.mode") === "subscribe" &&
    safeEqual(params.get("hub.verify_token"), verifyToken)
    ? params.get("hub.challenge")
    : null
}

const messageSchema = z.object({
  from: z.string().regex(/^\d{6,20}$/),
  id: z.string().min(1).max(256),
  type: z.string(),
  text: z.object({ body: z.string().max(4096) }).optional(),
  interactive: z
    .object({
      button_reply: z.object({ id: z.string().max(256) }).optional(),
      list_reply: z.object({ id: z.string().max(200) }).optional(),
    })
    .optional(),
  button: z.object({ payload: z.string().max(256).optional() }).optional(),
})

const payloadSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          field: z.string().optional(),
          value: z.object({
            metadata: z.object({ phone_number_id: z.string() }).optional(),
            messages: z.array(z.unknown()).optional(),
          }),
        })
      ),
    })
  ),
})

/**
 * Text and button replies from the configured number only. Status updates,
 * media, reactions and other numbers are ignored.
 */
export function parseWhatsAppEvents(
  body: unknown,
  phoneNumberId: string
): ChannelInbound[] {
  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) return []
  const events: ChannelInbound[] = []
  for (const entry of parsed.data.entry)
    for (const change of entry.changes) {
      if (change.value.metadata?.phone_number_id !== phoneNumberId) continue
      for (const raw of change.value.messages ?? []) {
        const message = messageSchema.safeParse(raw)
        if (!message.success) continue
        const { from, id, type } = message.data
        const base = {
          provider: "whatsapp" as const,
          endpointId: phoneNumberId,
          eventId: id,
          chatId: from,
          accountId: from,
          callbackId: null,
        }
        const reply =
          message.data.interactive?.button_reply?.id ??
          message.data.interactive?.list_reply?.id ??
          message.data.button?.payload
        if ((type === "interactive" || type === "button") && reply)
          events.push({ ...base, kind: "callback", text: reply })
        else if (type === "text" && message.data.text?.body.trim())
          events.push({
            ...base,
            kind: "text",
            text: message.data.text.body.trim(),
          })
      }
    }
  return events
}

function whatsAppBody(to: string, message: ChannelMessage) {
  const buttons = message.buttons ?? []
  const replies = buttons.filter((button) => button.kind === "reply")
  const urls = buttons.filter((button) => button.kind === "url")
  const base = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
  }
  if (replies.length && replies.length <= 3) {
    const text = [
      message.text,
      ...urls.map((button) =>
        button.kind === "url" ? `${button.label}: ${button.url}` : ""
      ),
    ].join("\n\n")
    return {
      ...base,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: text.slice(0, 1024) },
        action: {
          buttons: replies.map((button) =>
            button.kind === "reply"
              ? {
                  type: "reply",
                  reply: { id: button.data, title: button.label.slice(0, 20) },
                }
              : null
          ),
        },
      },
    }
  }
  const [url] = urls
  if (url?.kind === "url" && urls.length === 1 && !replies.length)
    return {
      ...base,
      type: "interactive",
      interactive: {
        type: "cta_url",
        body: { text: message.text.slice(0, 1024) },
        action: {
          name: "cta_url",
          parameters: { display_text: url.label.slice(0, 20), url: url.url },
        },
      },
    }
  const text = [
    message.text,
    ...replies.map((button, index) => `${index + 1}. ${button.label}`),
    ...urls.map((button) =>
      button.kind === "url" ? `${button.label}: ${button.url}` : ""
    ),
  ].join("\n")
  return {
    ...base,
    type: "text",
    text: { body: text.slice(0, 4096), preview_url: false },
  }
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export function createWhatsAppSender(
  config: WhatsAppChannelConfig,
  fetchImpl: FetchLike = (url, init) =>
    fetch(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    })
): ChannelSender {
  return {
    async send({ chatId, message }) {
      let response: Response
      try {
        response = await fetchImpl(
          `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${config.accessToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(whatsAppBody(chatId, message)),
          }
        )
      } catch {
        throw new ChannelSendError("NETWORK", "unknown")
      }
      if (response.status === 429)
        throw new ChannelSendError("RATE_LIMITED", "rejected", true)
      if (response.status >= 400 && response.status < 500)
        throw new ChannelSendError(`HTTP_${response.status}`, "rejected")
      if (!response.ok)
        throw new ChannelSendError(`HTTP_${response.status}`, "unknown")
      const json = (await response.json().catch(() => null)) as {
        messages?: { id?: string }[]
      } | null
      const id = json?.messages?.[0]?.id
      if (!id) throw new ChannelSendError("BAD_RESPONSE", "unknown")
      return { messageId: id }
    },
  }
}

export function whatsAppDeepLink(displayNumber: string, nonce: string) {
  return `https://wa.me/${displayNumber}?text=${encodeURIComponent(`LINK ${nonce}`)}`
}
