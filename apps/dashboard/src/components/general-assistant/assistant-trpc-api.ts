import type {
  AssistantConversationSummary,
  AssistantMessage,
  AssistantProposal,
} from "@halaalvest/assistant/contracts"
import type { AppRouter } from "@halaalvest/api/trpc/routers/_app"
import { halaalvestDataTransformer } from "@halaalvest/api/trpc/transformer"
import { createTRPCClient, httpLink } from "@trpc/client"
import type { AssistantApi } from "./assistant-api"

const CHANNEL = "web" as const

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
    channel: (channels.has(channel) ? channel : "web") as AssistantConversationSummary["channel"],
  }
}

/**
 * The website's `assistant` router client. One plain HTTP link (no batching,
 * no retries): a send or confirmation is one request, and a failed request
 * is only repeated when the person taps "Try again", with the same key.
 */
export function createTrpcAssistantApi(): AssistantApi {
  const client = createTRPCClient<AppRouter>({
    links: [
      httpLink({ transformer: halaalvestDataTransformer, url: "/api/trpc" }),
    ],
  })
  const assistant = client.assistant
  return {
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
          role: String(message.role).toLowerCase() === "user" ? "user" : "assistant",
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
}
