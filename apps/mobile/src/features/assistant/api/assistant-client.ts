import { getBaseUrl } from "@/lib/base-url"
import {
  notifyMobileSessionUnauthorized,
  shouldInvalidateUnauthorizedMobileSession,
} from "@/lib/mobile-session-invalidation"
import {
  createMobileTrpcClient,
  mobileRequestHeaders,
} from "@/lib/mobile-trpc-client"
import { getToken, type MobileProfile } from "@/lib/session-store"
import { fetch as expoFetch } from "expo/fetch"
import type {
  AssistantConversationSummary,
  AssistantMessage,
  AssistantProposal,
} from "@halaalvest/assistant/contracts"
import { AssistantStreamError, readAssistantStream } from "../model/assistant-stream"
import type { AssistantApi } from "./assistant-api"

/** One streamed turn may take a while (model + reads), but not forever. */
const STREAM_TIMEOUT_MS = 90_000

async function* textChunks(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      yield decoder.decode(value, { stream: true })
    }
    const rest = decoder.decode()
    if (rest) yield rest
  } finally {
    reader.releaseLock()
  }
}

/**
 * `POST <api origin>/api/assistant/turn` with the tRPC client's base URL and
 * headers (same session, same device). `expo/fetch` exposes the body as a
 * stream on native, so stages show as they arrive.
 */
const sendStreamed: AssistantApi["sendStreamed"] = async (input, onStage) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS)
  const requestToken = getToken()
  try {
    let response: Awaited<ReturnType<typeof expoFetch>>
    try {
      response = await expoFetch(`${getBaseUrl()}/api/assistant/turn`, {
        method: "POST",
        headers: {
          ...mobileRequestHeaders(),
          accept: "application/x-ndjson",
          "content-type": "application/json",
        },
        body: JSON.stringify({ ...input, channel: CHANNEL }),
        signal: controller.signal,
      })
    } catch {
      throw new AssistantStreamError("The reply stream could not start.", true)
    }
    if (
      shouldInvalidateUnauthorizedMobileSession({
        currentToken: getToken(),
        requestToken,
        responseStatus: response.status,
      })
    ) {
      notifyMobileSessionUnauthorized()
      throw new AssistantStreamError("Sign in again.", false, "unauthorized")
    }
    if (!response.ok || !response.body)
      throw new AssistantStreamError(
        `The reply stream answered ${response.status}.`,
        response.status !== 403 && response.status !== 400,
        response.status === 403 ? "forbidden" : "transport"
      )
    return await readAssistantStream(textChunks(response.body), onStage)
  } catch (error) {
    if (error instanceof AssistantStreamError) throw error
    throw new AssistantStreamError("The reply stream was interrupted.", true)
  } finally {
    clearTimeout(timer)
  }
}

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
    sendStreamed,
    resolveLink: (target) => assistant.links.resolve.query({ target }),
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
