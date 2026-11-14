import type {
  AssistantChannelLinkRow,
  AssistantChannelMembership,
  AssistantChannelOutboxRow,
  AssistantChannelOwner,
  AssistantChannelStore,
} from "@halaalvest/db"
import type { AssistantPrincipal } from "../principal"
import {
  type AssistantChannelConfig,
  type ChannelProvider,
  assistantChannelPaths,
  providerEnabled,
  providerLabel,
} from "./config"
import {
  createLinkNonce,
  isLinkNonce,
  linkNonceDigest,
  maskProviderAccount,
  providerAccountDigest,
} from "./identity"
import {
  protectedLink,
  renderChannelHelp,
  renderTurnForChannel,
} from "./render"
import { looksSensitive, sensitiveRefusal } from "./sensitive"
import { telegramDeepLink } from "./telegram"
import {
  type AssistantTurnRunner,
  type ChannelInbound,
  type ChannelInboxPayload,
  type ChannelMessage,
  ChannelSendError,
  type ChannelSender,
} from "./types"
import { whatsAppDeepLink } from "./whatsapp"

export const LINK_TTL_MS = 10 * 60_000
export const MAX_INBOX_ATTEMPTS = 3
export const MAX_SEND_ATTEMPTS = 3
const MAX_DRAIN_PER_CHAT = 20

export class AssistantChannelError extends Error {
  constructor(
    readonly code: "CHANNEL_DISABLED" | "NOT_FOUND" | "EXPIRED" | "NOT_CLAIMED",
    message: string
  ) {
    super(message)
    this.name = "AssistantChannelError"
  }
}

export type AssistantChannelRuntimeDeps = {
  store: AssistantChannelStore
  config: () => AssistantChannelConfig
  sender: (
    provider: ChannelProvider,
    config: AssistantChannelConfig
  ) => ChannelSender | null
  /** Coordinator-provided `runAssistantTurn`. */
  runTurn?: AssistantTurnRunner
  now?: () => Date
  /** Runs work after the webhook acknowledges. Tests await `idle()`. */
  schedule?: (task: () => Promise<void>) => void
  log?: (event: string, detail?: Record<string, unknown>) => void
}

type Command =
  | { name: "link"; nonce: string }
  | { name: "start" | "help" | "scope" | "new" | "cancel" | "disconnect" }
  | { name: "text"; text: string; choice: string | null }

/** Telegram slash commands, WhatsApp words, and button data. */
export function parseChannelCommand(
  provider: ChannelProvider,
  payload: Pick<ChannelInboxPayload, "kind" | "text">
): Command {
  const text = payload.text.trim()
  if (payload.kind === "callback") {
    if (text.startsWith("t:"))
      return { name: "text", text: text.slice(2), choice: null }
    if (text.startsWith("c:"))
      return { name: "text", text: text.slice(2), choice: text.slice(2) }
    if (text === "x:help") return { name: "help" }
    if (text === "x:disconnect") return { name: "disconnect" }
    return { name: "help" }
  }
  if (provider === "telegram") {
    const match = /^\/([a-z]+)(?:@\w+)?(?:\s+(\S+))?\s*$/i.exec(text)
    if (match) {
      const name = match[1]!.toLowerCase()
      if (name === "start")
        return match[2] ? { name: "link", nonce: match[2] } : { name: "start" }
      if (["help", "scope", "new", "cancel", "disconnect"].includes(name))
        return { name: name as "help" }
    }
  } else {
    const link = /^link\s+(\S+)$/i.exec(text)
    if (link) return { name: "link", nonce: link[1]! }
    const word = text.toLowerCase()
    if (["help", "scope", "new", "cancel", "disconnect"].includes(word))
      return { name: word as "help" }
  }
  return { name: "text", text, choice: null }
}

function membershipUsable(
  membership: AssistantChannelMembership | null
): membership is AssistantChannelMembership {
  return Boolean(
    membership &&
    !membership.userDeleted &&
    !membership.tenantPurging &&
    (membership.tenantStatus === "active" ||
      membership.tenantStatus === "pending")
  )
}

function principalFor(
  link: AssistantChannelLinkRow,
  membership: AssistantChannelMembership
): AssistantPrincipal {
  return {
    tenantId: membership.tenantId,
    tenantName: membership.tenantName,
    userId: membership.userId,
    membershipId: membership.membershipId,
    role: membership.role,
    channel: link.provider,
    channelLinkId: link.id,
  }
}

function isRefusalError(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code
  return (
    typeof code === "string" &&
    [
      "FORBIDDEN",
      "UNAUTHORIZED",
      "BAD_REQUEST",
      "NOT_FOUND",
      "PRECONDITION_FAILED",
    ].includes(code)
  )
}

type Reply = {
  messages: ChannelMessage[]
  /** Outbox link: null for replies that must arrive after access ends. */
  linkId: string | null
  state?: "done" | "ignored"
}

export function createAssistantChannelRuntime(
  deps: AssistantChannelRuntimeDeps
) {
  const now = deps.now ?? (() => new Date())
  const log = deps.log ?? (() => undefined)
  const pending = new Set<Promise<void>>()
  const chatLocks = new Map<string, Promise<void>>()
  const schedule =
    deps.schedule ??
    ((task: () => Promise<void>) => {
      const run = task()
        .catch((error: unknown) =>
          log("channel_task_failed", {
            name: error instanceof Error ? error.name : "unknown",
          })
        )
        .finally(() => pending.delete(run))
      pending.add(run)
    })

  function connectPrompt(config: AssistantChannelConfig): ChannelMessage {
    return {
      text: "Connect your Halaalvest account to use me here. Open Halaalvest, go to Assistant › Messaging and start a link.",
      buttons: [
        protectedLink(config.appUrl, {
          label: "Open Halaalvest",
          href: assistantChannelPaths.connect,
        }),
      ],
    }
  }

  // -------------------------------------------------------------------------
  // Link flow (signed-in app side)
  // -------------------------------------------------------------------------

  async function startLink(
    owner: AssistantChannelOwner,
    provider: ChannelProvider
  ) {
    const config = deps.config()
    if (!providerEnabled(config, provider))
      throw new AssistantChannelError(
        "CHANNEL_DISABLED",
        `${providerLabel[provider]} isn't available yet.`
      )
    const nonce = createLinkNonce()
    const challenge = await deps.store.issueChallenge({
      ...owner,
      provider,
      nonceDigest: linkNonceDigest(nonce),
      expiresAt: new Date(now().getTime() + LINK_TTL_MS),
    })
    const deepLink =
      provider === "telegram"
        ? telegramDeepLink(config.telegram!.botUsername, nonce)
        : config.whatsapp?.displayNumber
          ? whatsAppDeepLink(config.whatsapp.displayNumber, nonce)
          : null
    return {
      provider,
      nonce,
      expiresAt: challenge.expiresAt.toISOString(),
      deepLink,
      /** What to send if the deep link can't open. */
      instruction:
        provider === "telegram" ? `/start ${nonce}` : `LINK ${nonce}`,
    }
  }

  async function pendingLinks(owner: AssistantChannelOwner) {
    const rows = await deps.store.listPendingChallenges({
      ...owner,
      now: now(),
    })
    return rows.map((row) => ({
      challengeId: row.id,
      provider: row.provider,
      accountMasked: row.providerAccountMasked,
      claimedAt: row.claimedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt.toISOString(),
    }))
  }

  async function confirmLink(
    owner: AssistantChannelOwner,
    challengeId: string
  ) {
    const result = await deps.store.confirmChallenge({
      ...owner,
      challengeId,
      now: now(),
    })
    if (result.status !== "confirmed")
      throw result.status === "not_found"
        ? new AssistantChannelError(
            "NOT_FOUND",
            "This link request wasn't found."
          )
        : result.status === "expired"
          ? new AssistantChannelError(
              "EXPIRED",
              "This link expired. Nothing was connected. Start a new link."
            )
          : new AssistantChannelError(
              "NOT_CLAIMED",
              "Open the chat and send the link code first."
            )
    const { link } = result
    const membership = await deps.store.resolveMembership(link)
    await queueAndDeliver([
      {
        provider: link.provider,
        chatId: link.providerChatId,
        linkId: link.id,
        messages: [
          {
            text: `Connected ✓ ${membership?.tenantName ?? "Halaalvest"}. Ask me something, or send ${link.provider === "telegram" ? "/help" : "HELP"}.`,
          },
        ],
      },
    ])
    return {
      provider: link.provider,
      accountMasked: link.providerAccountMasked,
      confirmedAt: link.confirmedAt.toISOString(),
      replacedPrevious: result.revokedLinkIds.length > 0,
    }
  }

  async function cancelLink(owner: AssistantChannelOwner, challengeId: string) {
    return {
      cancelled: await deps.store.cancelChallenge({ ...owner, challengeId }),
    }
  }

  async function status(owner: { tenantId: string; userId: string }) {
    const config = deps.config()
    const links = await deps.store.listActiveLinks(owner)
    return {
      providers: (["telegram", "whatsapp"] as const).map((provider) => {
        const link = links.find((row) => row.provider === provider)
        return {
          provider,
          available: providerEnabled(config, provider),
          connected: Boolean(link),
          accountMasked: link?.providerAccountMasked ?? null,
          confirmedAt: link?.confirmedAt.toISOString() ?? null,
        }
      }),
    }
  }

  async function disconnect(
    owner: { tenantId: string; userId: string },
    provider: ChannelProvider
  ) {
    const revoked = await deps.store.revokeLinks({
      ...owner,
      provider,
      now: now(),
    })
    // linkId null: the notice must still arrive after access ends.
    await queueAndDeliver(
      revoked.map((link) => ({
        provider: link.provider,
        chatId: link.providerChatId,
        linkId: null,
        messages: [
          {
            text: "Disconnected. This chat no longer has access to Halaalvest.",
          },
        ],
      }))
    )
    return { disconnected: revoked.length > 0 }
  }

  // -------------------------------------------------------------------------
  // Ingress (webhook side)
  // -------------------------------------------------------------------------

  /**
   * Durably admits one event. Throws when the store is unavailable, so the
   * webhook answers 503 and the provider retries. Duplicates are acknowledged.
   */
  async function admit(event: ChannelInbound) {
    const config = deps.config()
    const sensitive =
      event.kind === "text" &&
      parseChannelCommand(event.provider, event).name !== "link" &&
      looksSensitive(event.text)
    const payload: ChannelInboxPayload = {
      kind: event.kind,
      text: sensitive ? "[redacted]" : event.text.slice(0, 4000),
      sensitive,
      accountDigest: providerAccountDigest(event.provider, event.accountId),
      accountMasked: maskProviderAccount(event.provider, event.accountId),
    }
    const admitted = await deps.store.admitInbox({
      environment: config.environment,
      provider: event.provider,
      endpointId: event.endpointId,
      eventId: event.eventId,
      providerChatId: event.chatId,
      linkId: null,
      payload,
    })
    if (admitted.status === "admitted")
      schedule(() => drainChat(event.provider, event.chatId))
    return admitted
  }

  /** One turn at a time per chat, oldest first. */
  function drainChat(provider: ChannelProvider, chatId: string) {
    const key = `${provider}:${chatId}`
    const previous = chatLocks.get(key) ?? Promise.resolve()
    const run = previous
      .catch(() => undefined)
      .then(async () => {
        for (let index = 0; index < MAX_DRAIN_PER_CHAT; index += 1) {
          const next = await deps.store.nextReceivedInbox({
            provider,
            providerChatId: chatId,
          })
          if (!next) return
          const outcome = await processInbox(next.id)
          // A retryable failure waits for the next message or recovery sweep.
          if (outcome === "retry") return
        }
      })
    chatLocks.set(key, run)
    void run
      .catch(() => undefined)
      .finally(() => {
        if (chatLocks.get(key) === run) chatLocks.delete(key)
      })
    return run
  }

  async function processInbox(
    id: string
  ): Promise<"done" | "retry" | "skipped"> {
    const row = await deps.store.leaseInbox(id, {
      maxAttempts: MAX_INBOX_ATTEMPTS,
    })
    if (!row) return "skipped"
    // The reply was already recorded: deliver it, never rerun the action.
    const recorded = await deps.store.listOutbox({ inboxId: row.id })
    if (recorded.length) {
      await deps.store.finishInbox(row.id, { state: "done" })
      await deliver(recorded)
      return "done"
    }
    let reply: Reply
    try {
      reply = await handle(
        row.provider,
        row.providerChatId,
        row.payload as ChannelInboxPayload,
        row.id
      )
    } catch (error) {
      log("channel_turn_failed", {
        name: error instanceof Error ? error.name : "unknown",
      })
      if (row.attempts < MAX_INBOX_ATTEMPTS) {
        await deps.store.finishInbox(row.id, {
          state: "received",
          errorCode: "TURN_FAILED",
        })
        return "retry"
      }
      reply = {
        messages: [
          {
            text: "Sorry, I couldn't answer that. Please try again in a moment.",
          },
        ],
        linkId: null,
      }
    }
    const rows = await deps.store.enqueueOutbox(
      reply.messages.map((message, sequence) => ({
        provider: row.provider,
        providerChatId: row.providerChatId,
        linkId: reply.linkId,
        inboxId: row.id,
        sequence,
        payload: message,
      }))
    )
    await deps.store.finishInbox(row.id, {
      state: reply.state ?? "done",
      linkId: reply.linkId,
    })
    await deliver(rows)
    return "done"
  }

  async function handle(
    provider: ChannelProvider,
    chatId: string,
    payload: ChannelInboxPayload,
    inboxId: string
  ): Promise<Reply> {
    const config = deps.config()
    const say = (text: string, linkId: string | null = null): Reply => ({
      messages: [{ text }],
      linkId,
    })
    if (payload.sensitive) return say(sensitiveRefusal)
    const command = parseChannelCommand(provider, payload)

    if (command.name === "link") {
      const restart = (text: string): Reply => ({
        messages: [{ ...connectPrompt(config), text }],
        linkId: null,
      })
      if (!isLinkNonce(command.nonce))
        return restart(
          "This link no longer works. Nothing changed. Start a new link in Halaalvest."
        )
      const claim = await deps.store.claimChallenge({
        provider,
        nonceDigest: linkNonceDigest(command.nonce),
        accountDigest: payload.accountDigest,
        accountMasked: payload.accountMasked,
        chatId,
        now: now(),
      })
      if (claim.status !== "claimed")
        return restart(
          claim.status === "expired"
            ? "This link expired. Nothing changed. Start a new link in Halaalvest."
            : "This link no longer works. Nothing changed. Start a new link in Halaalvest."
        )
      return say(
        `Almost done. Open Halaalvest and confirm ${payload.accountMasked} to connect ${claim.tenantName}. Nothing is connected until you confirm there.`
      )
    }

    const link = await deps.store.findActiveLink({
      provider,
      accountDigest: payload.accountDigest,
    })
    if (!link || link.providerChatId !== chatId)
      return { messages: [connectPrompt(config)], linkId: null }

    if (command.name === "disconnect") {
      await deps.store.revokeLinks({ linkId: link.id, now: now() })
      return say(
        "Disconnected. This chat no longer has access to Halaalvest. Nothing else changed."
      )
    }

    // Re-resolve the live membership (role, tenant, status) on every turn.
    const membership = await deps.store.resolveMembership(link)
    if (!membershipUsable(membership)) {
      const tenantName = (membership as AssistantChannelMembership | null)
        ?.tenantName
      await deps.store.revokeLinks({ linkId: link.id, now: now() })
      return {
        messages: [
          {
            ...connectPrompt(config),
            text: `Your access to ${tenantName ?? "this cooperative"} through this chat has ended. Nothing else changed. To reconnect, start a new link in Halaalvest.`,
          },
        ],
        linkId: null,
      }
    }
    const principal = principalFor(link, membership)
    const renderOptions = {
      provider,
      role: membership.role,
      appUrl: config.appUrl,
      messagingChannelEnabled: providerEnabled(config, provider),
    }

    if (command.name !== "text")
      switch (command.name) {
        case "start":
        case "help":
          return {
            messages: [
              renderChannelHelp({
                ...renderOptions,
                tenantName: membership.tenantName,
              }),
            ],
            linkId: link.id,
          }
        case "scope":
          return say(
            `This chat is connected to ${membership.tenantName} (${membership.role.replace(/_/g, " ")}) as ${link.providerAccountMasked}. To use another cooperative, connect again from it in Halaalvest.`,
            link.id
          )
        case "new":
          await deps.store.setLinkConversation(link.id, null)
          return say("Started a new chat.", link.id)
        default:
          return say(
            "Nothing is waiting here. Drafts and confirmations stay in Halaalvest, and nothing is saved until you confirm there.",
            link.id
          )
      }

    if (!deps.runTurn)
      return say(
        "The assistant isn't available yet. Please try again later.",
        link.id
      )
    let conversationId = link.conversationId
    if (!conversationId) {
      conversationId = (
        await deps.store.createConversation({ ...link, channel: provider })
      ).id
      await deps.store.setLinkConversation(link.id, conversationId)
    }
    try {
      const output = await deps.runTurn(principal, {
        conversationId,
        // Same inbox row → same request id: a replay returns the saved reply.
        requestId: `${provider}-${inboxId}`,
        text: command.text.slice(0, 4000),
        ...(command.choice
          ? {
              choice: { proposalId: null, value: command.choice.slice(0, 200) },
            }
          : {}),
      })
      return {
        messages: renderTurnForChannel(output, renderOptions),
        linkId: link.id,
      }
    } catch (error) {
      if (!isRefusalError(error)) throw error
      return say("I can't do that here. You can try it in Halaalvest.", link.id)
    }
  }

  // -------------------------------------------------------------------------
  // Outbox
  // -------------------------------------------------------------------------

  async function queueAndDeliver(
    items: {
      provider: ChannelProvider
      chatId: string
      linkId: string | null
      messages: ChannelMessage[]
    }[]
  ) {
    for (const item of items) {
      const rows = await deps.store.enqueueOutbox(
        item.messages.map((message, sequence) => ({
          provider: item.provider,
          providerChatId: item.chatId,
          linkId: item.linkId,
          inboxId: null,
          sequence,
          payload: message,
        }))
      )
      schedule(() => deliver(rows.filter((row) => row.state === "pending")))
    }
  }

  /** Sends in order; stops a chat's sequence at the first unsent message. */
  async function deliver(rows: AssistantChannelOutboxRow[]) {
    for (const row of [...rows].sort((a, b) => a.sequence - b.sequence)) {
      if (row.state === "sent") continue
      const outcome = await deliverOne(row.id)
      if (outcome !== "sent") return
    }
  }

  async function deliverOne(
    outboxId: string
  ): Promise<"sent" | "failed" | "unknown" | "skipped"> {
    const config = deps.config()
    const begun = await deps.store.beginSend(outboxId)
    if (begun.status !== "started") return "skipped"
    const { row } = begun
    const sender = deps.sender(row.provider, config)
    const finish = (
      outcome: Parameters<AssistantChannelStore["finishSend"]>[1]
    ) =>
      deps.store.finishSend(row.id, outcome, {
        maxAttempts: MAX_SEND_ATTEMPTS,
        now: now(),
      })
    if (!sender) {
      await finish({
        kind: "rejected",
        errorCode: "CHANNEL_DISABLED",
        retryable: false,
      })
      return "failed"
    }
    try {
      const sent = await sender.send({
        chatId: row.providerChatId,
        message: row.payload as ChannelMessage,
      })
      await finish({ kind: "sent", providerMessageId: sent.messageId })
      return "sent"
    } catch (error) {
      if (error instanceof ChannelSendError && error.outcome === "rejected") {
        await finish({
          kind: "rejected",
          errorCode: error.code,
          retryable: error.retryable,
        })
        return "failed"
      }
      // Possibly delivered: record `unknown`, never resend blindly.
      await finish({
        kind: "unknown",
        errorCode:
          error instanceof ChannelSendError ? error.code : "SEND_ERROR",
      })
      return "unknown"
    }
  }

  /** Retries pending outbox rows for an inbox without rerunning its turn. */
  async function retryDelivery(inboxId: string) {
    await deliver(await deps.store.listOutbox({ inboxId }))
  }

  /**
   * Bounded recovery sweep for events admitted but not finished (process
   * restart). Safe to call from a job; each row is leased once.
   */
  async function recover(
    options: { olderThanMs?: number; limit?: number } = {}
  ) {
    const rows = await deps.store.listReceivedInbox({
      createdBefore: new Date(
        now().getTime() - (options.olderThanMs ?? 60_000)
      ),
      limit: options.limit ?? 25,
    })
    const chats = new Map(
      rows.map((row) => [`${row.provider}:${row.providerChatId}`, row])
    )
    for (const row of chats.values())
      await drainChat(row.provider, row.providerChatId)
    return { chats: chats.size }
  }

  async function acknowledgeCallback(event: ChannelInbound) {
    if (!event.callbackId) return
    await deps
      .sender(event.provider, deps.config())
      ?.acknowledgeCallback?.(event.callbackId)
      .catch(() => undefined)
  }

  return {
    startLink,
    pendingLinks,
    confirmLink,
    cancelLink,
    status,
    disconnect,
    admit,
    acknowledgeCallback,
    drainChat,
    processInbox,
    retryDelivery,
    recover,
    config: deps.config,
    /** Resolves when scheduled background work has settled (tests). */
    async idle() {
      while (pending.size || chatLocks.size)
        await Promise.allSettled([...pending, ...chatLocks.values()])
    },
  }
}

export type AssistantChannelRuntime = ReturnType<
  typeof createAssistantChannelRuntime
>
