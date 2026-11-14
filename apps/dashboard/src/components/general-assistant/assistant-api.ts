"use client"

import type {
  AssistantActionResult,
  AssistantConversationSummary,
  AssistantMessage,
  AssistantProposal,
  AssistantTurnInput,
  AssistantTurnOutput,
  ProposalConfirmInput,
  ProposalEditInput,
} from "@halaalvest/assistant/contracts"
import { createContext, useContext } from "react"

/**
 * The client side of the `assistant` tRPC router (see
 * `.brain/tasks/2026-11-14-cooperative-assistant-delivery.md`). Every call is
 * a plain promise: nothing here is queued, paused or replayed, so a request
 * that fails while offline is never resubmitted on reconnect. Retrying a send
 * reuses its `requestId`, and retrying a confirm reuses its
 * `confirmationKey`, so the server returns the saved reply or result.
 */
export type AssistantBootstrap = {
  role: "member" | "staff"
  cooperativeName: string
  suggestions: { capabilityId: string; label: string }[]
  help: { capabilityId: string; title: string; suggestion: string }[]
}

export type AssistantConversationDetail = {
  conversation: AssistantConversationSummary
  messages: AssistantMessage[]
  proposals: AssistantProposal[]
}

export type AssistantApi = {
  bootstrap: () => Promise<AssistantBootstrap>
  listConversations: (cursor?: string | null) => Promise<{
    items: AssistantConversationSummary[]
    nextCursor: string | null
  }>
  createConversation: () => Promise<{ id: string }>
  getConversation: (id: string) => Promise<AssistantConversationDetail>
  archiveConversation: (id: string) => Promise<{ ok: true }>
  send: (input: AssistantTurnInput) => Promise<AssistantTurnOutput>
  getProposal: (proposalId: string) => Promise<AssistantProposal>
  editProposal: (input: ProposalEditInput) => Promise<AssistantProposal>
  confirmProposal: (input: ProposalConfirmInput) => Promise<AssistantActionResult>
  cancelProposal: (proposalId: string) => Promise<AssistantProposal>
}

const AssistantApiContext = createContext<AssistantApi | null>(null)

export const AssistantApiProvider = AssistantApiContext.Provider

export function useAssistantApi() {
  const api = useContext(AssistantApiContext)
  if (!api) throw new Error("useAssistantApi needs an AssistantApiProvider")
  return api
}

/** Query keys shared by the page and the quick widget. */
export const assistantKeys = {
  all: ["cooperative-assistant"] as const,
  bootstrap: () => [...assistantKeys.all, "bootstrap"] as const,
  conversations: () => [...assistantKeys.all, "conversations"] as const,
  conversation: (id: string) =>
    [...assistantKeys.all, "conversation", id] as const,
}

/** Client idempotency key for one send or one confirmation. */
export function newAssistantKey(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  return `${prefix}_${random}`
}
