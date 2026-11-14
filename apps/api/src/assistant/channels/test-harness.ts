import type {
  AssistantAnswer,
  AssistantPart,
  AssistantTurnInput,
  AssistantTurnOutput,
} from "@halaalvest/assistant"
import { fixtureAnswers, fixtureProposal } from "@halaalvest/assistant/fixtures"
import type { AssistantChannelMembership } from "@halaalvest/db"
import { Hono } from "hono"
import type { AssistantPrincipal } from "../principal"
import { readAssistantChannelConfig } from "./config"
import { createMemoryAssistantChannelStore } from "./memory-store"
import { registerAssistantChannelWebhooks } from "./routes"
import { createAssistantChannelRuntime } from "./runtime"
import {
  type ChannelMessage,
  ChannelSendError,
  type ChannelSender,
} from "./types"

/** Synthetic fixture traffic only. No provider is ever called. */
export const fixtureEnv = {
  HALAALVEST_ENV: "test",
  DASHBOARD_APP_URL: "https://app.halaalvest.test",
  ASSISTANT_TELEGRAM_ENABLED: "true",
  ASSISTANT_TELEGRAM_BOT_TOKEN: "fixture-bot-token",
  ASSISTANT_TELEGRAM_WEBHOOK_SECRET: "fixture-telegram-secret",
  ASSISTANT_TELEGRAM_BOT_USERNAME: "halaalvest_fixture_bot",
  ASSISTANT_WHATSAPP_ENABLED: "true",
  ASSISTANT_WHATSAPP_APP_SECRET: "fixture-app-secret",
  ASSISTANT_WHATSAPP_VERIFY_TOKEN: "fixture-verify-token",
  ASSISTANT_WHATSAPP_ACCESS_TOKEN: "fixture-access-token",
  ASSISTANT_WHATSAPP_PHONE_NUMBER_ID: "100200300",
  ASSISTANT_WHATSAPP_DISPLAY_NUMBER: "+234 800 000 0000",
}

export const member = {
  tenantId: "tenant-amanah",
  userId: "user-member",
  membershipId: "membership-member",
}
export const otherUser = {
  tenantId: "tenant-amanah",
  userId: "user-other",
  membershipId: "membership-other",
}

const memberships: AssistantChannelMembership[] = [
  {
    ...member,
    tenantName: "Amanah Cooperative",
    tenantStatus: "active",
    tenantPurging: false,
    userDeleted: false,
    role: "member",
  },
  {
    ...otherUser,
    tenantName: "Amanah Cooperative",
    tenantStatus: "active",
    tenantPurging: false,
    userDeleted: false,
    role: "member",
  },
]

function output(
  input: AssistantTurnInput,
  parts: AssistantPart[],
  withProposal = false
): AssistantTurnOutput {
  const createdAt = "2026-11-14T10:00:00.000Z"
  return {
    conversationId: input.conversationId,
    userMessage: {
      id: `u-${input.requestId}`,
      role: "user",
      parts: [{ type: "text", text: input.text }],
      createdAt,
    },
    reply: { id: `a-${input.requestId}`, role: "assistant", parts, createdAt },
    proposals: withProposal ? [fixtureProposal] : [],
  }
}

/** Fixture turn: a read for loan/receipt questions, a draft for "proof I paid". */
export async function fixtureTurn(
  _principal: AssistantPrincipal,
  input: AssistantTurnInput
) {
  const answer = (value: AssistantAnswer): AssistantPart => ({
    type: "answer",
    answer: value,
  })
  if (/receipt/i.test(input.text) && !/proof/i.test(input.text))
    return output(input, [answer(fixtureAnswers.receipts)])
  if (/proof/i.test(input.text))
    return output(
      input,
      [
        { type: "text", text: "I drafted your receipt." },
        { type: "proposal", proposalId: fixtureProposal.id, revision: 1 },
      ],
      true
    )
  return output(input, [answer(fixtureAnswers.financingStatus)])
}

export function createChannelHarness(env: Record<string, string> = fixtureEnv) {
  let current = new Date("2026-11-14T10:00:00.000Z")
  const memory = createMemoryAssistantChannelStore(memberships, () => current)
  const sent: { provider: string; chatId: string; message: ChannelMessage }[] =
    []
  const sendFailures: ChannelSendError[] = []
  const turns: { principal: AssistantPrincipal; input: AssistantTurnInput }[] =
    []
  const turnFailures: Error[] = []
  let acknowledged = 0
  const config = readAssistantChannelConfig(env)

  const sender = (provider: "telegram" | "whatsapp"): ChannelSender => ({
    async send({ chatId, message }) {
      const failure = sendFailures.shift()
      if (failure) throw failure
      sent.push({ provider, chatId, message })
      return { messageId: `msg-${sent.length}` }
    },
    async acknowledgeCallback() {
      acknowledged += 1
    },
  })

  const runtime = createAssistantChannelRuntime({
    store: memory.store,
    config: () => config,
    sender: (provider) => sender(provider),
    runTurn: async (principal, input) => {
      turns.push({ principal, input })
      const failure = turnFailures.shift()
      if (failure) throw failure
      return fixtureTurn(principal, input)
    },
    now: () => current,
  })
  const app = new Hono()
  registerAssistantChannelWebhooks(app, { runtime })

  return {
    app,
    runtime,
    memory,
    sent,
    turns,
    config,
    failNextSend: (
      error = new ChannelSendError("RATE_LIMITED", "rejected", true)
    ) => sendFailures.push(error),
    failNextTurn: (error = new Error("model unavailable")) =>
      turnFailures.push(error),
    acknowledged: () => acknowledged,
    advance: (ms: number) => {
      current = new Date(current.getTime() + ms)
    },
    lastText: () => sent.at(-1)?.message.text ?? "",
  }
}

export { ChannelSendError }
