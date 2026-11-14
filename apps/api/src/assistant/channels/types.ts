import type {
  AssistantTurnInput,
  AssistantTurnOutput,
} from "@halaalvest/assistant"
import type { AssistantPrincipal } from "../principal"
import type { ChannelProvider } from "./config"

export type ChannelButton =
  | { kind: "url"; label: string; url: string }
  /** `data` comes back as a callback (Telegram) or button reply (WhatsApp). */
  | { kind: "reply"; label: string; data: string }

/** Provider-neutral outbound message, saved to the outbox before sending. */
export type ChannelMessage = {
  text: string
  buttons?: ChannelButton[]
}

/** One normalized inbound event from a private chat. */
export type ChannelInbound = {
  provider: ChannelProvider
  endpointId: string
  eventId: string
  chatId: string
  /** Provider account (Telegram user id, WhatsApp wa_id). */
  accountId: string
  kind: "text" | "callback"
  /** Message text, or callback data for a button tap. */
  text: string
  callbackId: string | null
}

/** What the inbox keeps: minimal, redacted when sensitive. */
export type ChannelInboxPayload = {
  kind: "text" | "callback"
  text: string
  sensitive: boolean
  accountDigest: string
  accountMasked: string
}

export class ChannelSendError extends Error {
  constructor(
    readonly code: string,
    /** `rejected` = definitely not delivered; `unknown` = may have been. */
    readonly outcome: "rejected" | "unknown",
    readonly retryable = false
  ) {
    super(code)
    this.name = "ChannelSendError"
  }
}

export type ChannelSender = {
  send(input: {
    chatId: string
    message: ChannelMessage
  }): Promise<{ messageId: string }>
  /** Clears the Telegram button spinner. Best effort. */
  acknowledgeCallback?(callbackId: string): Promise<void>
}

export type AssistantTurnRunner = (
  principal: AssistantPrincipal,
  input: AssistantTurnInput
) => Promise<AssistantTurnOutput>
