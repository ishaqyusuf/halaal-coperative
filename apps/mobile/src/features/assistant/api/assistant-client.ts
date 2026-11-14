import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import type { MobileProfile } from "@/lib/session-store"
import type {
  AssistantConversationSummary,
  AssistantMessage,
  AssistantProposal,
} from "@halaalvest/assistant/contracts"
import type { AssistantApi } from "./assistant-api"

const CHANNEL = "native" as const
const channels = new Set(["web", "native", "whatsapp", "telegram"])

function summary(row: {
  id: string
  title: string
  channel: string
  updatedAt: string
  lastMessagePreview: string | null
}): AssistantConversationSummary {
  const channel = row.channel.toLowerCase()
  return {
    ...row,
    channel: (channels.has(channel)
      ? channel
      : "native") as AssistantConversationSummary["channel"],
  }
}

export function assistantScope(profile: MobileProfile) {
  return `${profile.tenant.id}:${profile.activeMembershipId}`
}

/**
 * The native `assistant` router client for one signed membership. The
 * mobile transport sends the session token per request, so a client made
 * for one membership is never reused after a switch (the screen pauses).
 * Each call is one request with no queueing or replay; a failed send or
 * confirmation is repeated only on "Try again", with the same key.
 */
const apis = new Map<string, AssistantApi>()

export function getAssistantApi(profile: MobileProfile): AssistantApi {
  const scope = assistantScope(profile)
  const existing = apis.get(scope)
  if (existing) return existing
  const assistant = createMobileTrpcClient().assistant
  const api: AssistantApi = {
    bootstrap: () => assistant.bootstrap.query({ channel: CHANNEL }),
    listConversations: async (cursor) => {
      const page = await assistant.conversations.list.query({
        channel: CHANNEL,
        cursor: cursor ?? null,
      })
      return { items: page.items.map(summary), nextCursor: page.nextCursor }
    },
    createConversation: () =>
      assistant.conversations.create.mutate({ channel: CHANNEL }),
    getConversation: async (id) => {
      const detail = await assistant.conversations.get.query({ id })
      return {
        conversation: summary(detail.conversation),
        messages: detail.messages.map((message) => ({
          ...message,
          role:
            String(message.role).toLowerCase() === "user" ? "user" : "assistant",
        })) as AssistantMessage[],
        proposals: detail.proposals as AssistantProposal[],
      }
    },
    archiveConversation: (id) => assistant.conversations.archive.mutate({ id }),
    send: (input) => assistant.send.mutate({ ...input, channel: CHANNEL }),
    getProposal: (proposalId) => assistant.proposals.get.query({ proposalId }),
    editProposal: (input) =>
      assistant.proposals.edit.mutate({ ...input, channel: CHANNEL }),
    confirmProposal: (input) =>
      assistant.proposals.confirm.mutate({ ...input, channel: CHANNEL }),
    cancelProposal: (proposalId) =>
      assistant.proposals.cancel.mutate({ proposalId, channel: CHANNEL }),
  }
  apis.set(scope, api)
  return api
}
