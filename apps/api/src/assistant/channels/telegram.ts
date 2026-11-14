import { z } from "zod"
import type { TelegramChannelConfig } from "./config"
import {
  type ChannelInbound,
  type ChannelMessage,
  ChannelSendError,
  type ChannelSender,
} from "./types"

const user = z.object({
  id: z.number().int(),
  is_bot: z.boolean().optional(),
})
const chat = z.object({ id: z.number().int(), type: z.string() })

const updateSchema = z.object({
  update_id: z.number().int(),
  message: z
    .object({
      message_id: z.number().int(),
      from: user.optional(),
      chat,
      text: z.string().max(4096).optional(),
    })
    .optional(),
  callback_query: z
    .object({
      id: z.string().max(128),
      from: user,
      data: z.string().max(64).optional(),
      message: z.object({ chat }).optional(),
    })
    .optional(),
})

/**
 * Private chats only: groups, channels, bots, edits and media are ignored.
 * Telegram private chat ids equal the user's id.
 */
export function parseTelegramUpdate(
  body: unknown,
  endpointId: string
): ChannelInbound | null {
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return null
  const update = parsed.data
  const base = {
    provider: "telegram" as const,
    endpointId,
    eventId: String(update.update_id),
  }
  if (update.message) {
    const { message } = update
    if (
      message.chat.type !== "private" ||
      !message.from ||
      message.from.is_bot ||
      !message.text?.trim()
    )
      return null
    return {
      ...base,
      chatId: String(message.chat.id),
      accountId: String(message.from.id),
      kind: "text",
      text: message.text.trim(),
      callbackId: null,
    }
  }
  const callback = update.callback_query
  if (callback?.message && callback.data && !callback.from.is_bot) {
    if (callback.message.chat.type !== "private") return null
    return {
      ...base,
      chatId: String(callback.message.chat.id),
      accountId: String(callback.from.id),
      kind: "callback",
      text: callback.data,
      callbackId: callback.id,
    }
  }
  return null
}

/** Telegram URL buttons must be HTTPS; local origins fall back to text. */
function telegramBody(chatId: string, message: ChannelMessage) {
  const buttons = message.buttons ?? []
  const urlButtons = buttons.filter(
    (button) => button.kind === "url" && button.url.startsWith("https://")
  )
  const inlineText = buttons
    .filter(
      (button) => button.kind === "url" && !button.url.startsWith("https://")
    )
    .map((button) =>
      button.kind === "url" ? `${button.label}: ${button.url}` : ""
    )
  const rows = [
    ...buttons
      .filter((button) => button.kind === "reply")
      .map((button) =>
        button.kind === "reply"
          ? [{ text: button.label, callback_data: button.data.slice(0, 64) }]
          : []
      ),
    ...urlButtons.map((button) =>
      button.kind === "url" ? [{ text: button.label, url: button.url }] : []
    ),
  ]
  const text = [message.text, ...inlineText].join("\n\n").slice(0, 4096)
  return {
    chat_id: chatId,
    text,
    link_preview_options: { is_disabled: true },
    ...(rows.length ? { reply_markup: { inline_keyboard: rows } } : {}),
  }
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export function createTelegramSender(
  config: TelegramChannelConfig,
  fetchImpl: FetchLike = (url, init) =>
    fetch(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    })
): ChannelSender {
  const call = (method: string, body: unknown) =>
    fetchImpl(`https://api.telegram.org/bot${config.botToken}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  return {
    async send({ chatId, message }) {
      let response: Response
      try {
        response = await call("sendMessage", telegramBody(chatId, message))
      } catch {
        // Timeout or network loss after the request left: outcome unknown.
        throw new ChannelSendError("NETWORK", "unknown")
      }
      if (response.status === 429)
        throw new ChannelSendError("RATE_LIMITED", "rejected", true)
      if (response.status >= 400 && response.status < 500)
        throw new ChannelSendError(`HTTP_${response.status}`, "rejected")
      if (!response.ok)
        throw new ChannelSendError(`HTTP_${response.status}`, "unknown")
      const json = (await response.json().catch(() => null)) as {
        ok?: boolean
        result?: { message_id?: number }
      } | null
      const id = json?.result?.message_id
      if (!json?.ok || typeof id !== "number")
        throw new ChannelSendError("BAD_RESPONSE", "unknown")
      return { messageId: String(id) }
    },
    async acknowledgeCallback(callbackId) {
      await call("answerCallbackQuery", {
        callback_query_id: callbackId,
      }).catch(() => undefined)
    },
  }
}

export function telegramDeepLink(botUsername: string, nonce: string) {
  return `https://t.me/${botUsername}?start=${nonce}`
}
