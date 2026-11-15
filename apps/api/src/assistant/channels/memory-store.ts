import { randomUUID } from "node:crypto"
import type {
  AssistantChannelChallengeRow,
  AssistantChannelInboxRow,
  AssistantChannelLinkRow,
  AssistantChannelMembership,
  AssistantChannelOutboxRow,
  AssistantChannelStore,
} from "@halaalvest/db"

/**
 * In-memory `AssistantChannelStore` with the same conditional state rules as
 * the Prisma store. Test fixture only; never wired into the server.
 */
export function createMemoryAssistantChannelStore(
  memberships: AssistantChannelMembership[] = [],
  now: () => Date = () => new Date()
) {
  const challenges: (AssistantChannelChallengeRow & {
    nonceDigest: string
    tenantName: string
  })[] = []
  const links: AssistantChannelLinkRow[] = []
  const inbox: (AssistantChannelInboxRow & {
    environment: string
    endpointId: string
    errorCode: string | null
  })[] = []
  const outbox: (AssistantChannelOutboxRow & { createdAt: number })[] = []
  const conversations: { id: string; channel: string }[] = []
  let clock = 0
  const membershipFor = (owner: {
    tenantId: string
    userId: string
    membershipId: string
  }) =>
    memberships.find(
      (row) =>
        row.membershipId === owner.membershipId &&
        row.tenantId === owner.tenantId &&
        row.userId === owner.userId
    ) ?? null

  const store: AssistantChannelStore = {
    async issueChallenge(input) {
      for (const row of challenges)
        if (
          row.tenantId === input.tenantId &&
          row.userId === input.userId &&
          row.membershipId === input.membershipId &&
          row.provider === input.provider &&
          (row.status === "issued" || row.status === "claimed")
        )
          row.status = "cancelled"
      const row = {
        id: randomUUID(),
        tenantId: input.tenantId,
        userId: input.userId,
        membershipId: input.membershipId,
        provider: input.provider,
        nonceDigest: input.nonceDigest,
        status: "issued" as const,
        providerAccountDigest: null,
        providerAccountMasked: null,
        providerChatId: null,
        expiresAt: input.expiresAt,
        claimedAt: null,
        confirmedAt: null,
        tenantName: membershipFor(input)?.tenantName ?? "Cooperative",
      }
      challenges.push(row)
      return { id: row.id, expiresAt: row.expiresAt }
    },
    async claimChallenge(input) {
      const row = challenges.find(
        (item) => item.nonceDigest === input.nonceDigest
      )
      if (!row || row.provider !== input.provider) return { status: "invalid" }
      if (row.status !== "issued") return { status: "used" }
      if (row.expiresAt <= input.now) {
        row.status = "expired"
        return { status: "expired" }
      }
      Object.assign(row, {
        status: "claimed",
        claimedAt: input.now,
        providerAccountDigest: input.accountDigest,
        providerAccountMasked: input.accountMasked,
        providerChatId: input.chatId,
      })
      return {
        status: "claimed",
        challenge: { ...row },
        tenantName: row.tenantName,
      }
    },
    async listPendingChallenges(input) {
      return challenges.filter(
        (row) =>
          row.tenantId === input.tenantId &&
          row.userId === input.userId &&
          row.membershipId === input.membershipId &&
          row.status === "claimed" &&
          row.expiresAt > input.now
      )
    },
    async confirmChallenge(input) {
      const row = challenges.find(
        (item) =>
          item.id === input.challengeId &&
          item.tenantId === input.tenantId &&
          item.userId === input.userId &&
          item.membershipId === input.membershipId
      )
      if (!row) return { status: "not_found" }
      if (row.status !== "claimed" || !row.providerAccountDigest)
        return { status: "not_claimed" }
      if (row.expiresAt <= input.now) {
        row.status = "expired"
        return { status: "expired" }
      }
      row.status = "confirmed"
      row.confirmedAt = input.now
      const revoked = links.filter(
        (link) =>
          link.status === "active" &&
          link.provider === row.provider &&
          (link.providerAccountDigest === row.providerAccountDigest ||
            (link.tenantId === input.tenantId && link.userId === input.userId))
      )
      for (const link of revoked)
        Object.assign(link, { status: "revoked", revokedAt: input.now })
      const link: AssistantChannelLinkRow = {
        id: randomUUID(),
        tenantId: row.tenantId,
        userId: row.userId,
        membershipId: row.membershipId,
        provider: row.provider,
        providerAccountDigest: row.providerAccountDigest,
        providerAccountMasked: row.providerAccountMasked!,
        providerChatId: row.providerChatId!,
        conversationId: null,
        status: "active",
        confirmedAt: input.now,
        revokedAt: null,
      }
      links.push(link)
      return {
        status: "confirmed",
        link: { ...link },
        revokedLinkIds: revoked.map((item) => item.id),
      }
    },
    async cancelChallenge(input) {
      const row = challenges.find(
        (item) =>
          item.id === input.challengeId &&
          item.tenantId === input.tenantId &&
          item.userId === input.userId &&
          item.membershipId === input.membershipId &&
          (item.status === "issued" || item.status === "claimed")
      )
      if (row) row.status = "cancelled"
      return Boolean(row)
    },
    async listActiveLinks(input) {
      return links.filter(
        (row) =>
          row.tenantId === input.tenantId &&
          row.userId === input.userId &&
          row.status === "active"
      )
    },
    async findActiveLink(input) {
      const row = links.find(
        (item) =>
          item.provider === input.provider &&
          item.providerAccountDigest === input.accountDigest &&
          item.status === "active"
      )
      return row ? { ...row } : null
    },
    async revokeLinks(input) {
      const rows = links.filter(
        (row) =>
          row.status === "active" &&
          ("linkId" in input
            ? row.id === input.linkId
            : row.tenantId === input.tenantId &&
              row.userId === input.userId &&
              row.provider === input.provider)
      )
      for (const row of rows)
        Object.assign(row, { status: "revoked", revokedAt: input.now })
      return rows.map((row) => ({ ...row }))
    },
    async setLinkConversation(linkId, conversationId) {
      const row = links.find(
        (item) => item.id === linkId && item.status === "active"
      )
      if (row) row.conversationId = conversationId
    },
    async resolveMembership(owner) {
      return membershipFor(owner)
    },
    async createConversation(owner) {
      const row = { id: randomUUID(), channel: owner.channel }
      conversations.push(row)
      return { id: row.id }
    },
    async admitInbox(input) {
      const existing = inbox.find(
        (row) =>
          row.environment === input.environment &&
          row.provider === input.provider &&
          row.endpointId === input.endpointId &&
          row.eventId === input.eventId
      )
      if (existing)
        return { status: "duplicate", id: existing.id, state: existing.state }
      const row = {
        id: randomUUID(),
        environment: input.environment,
        provider: input.provider,
        endpointId: input.endpointId,
        eventId: input.eventId,
        providerChatId: input.providerChatId,
        linkId: input.linkId,
        payload: structuredClone(input.payload),
        state: "received" as const,
        attempts: 0,
        errorCode: null,
        createdAt: new Date(now().getTime() + clock++),
      }
      inbox.push(row)
      return { status: "admitted", id: row.id, state: row.state }
    },
    async getInbox(id) {
      const row = inbox.find((item) => item.id === id)
      return row ? { ...row } : null
    },
    async nextReceivedInbox(input) {
      return (
        inbox.find(
          (row) =>
            row.provider === input.provider &&
            row.providerChatId === input.providerChatId &&
            row.state === "received"
        ) ?? null
      )
    },
    async listReceivedInbox(input) {
      return inbox
        .filter(
          (row) =>
            row.state === "received" && row.createdAt < input.createdBefore
        )
        .slice(0, input.limit)
    },
    async leaseInbox(id, options) {
      const row = inbox.find(
        (item) => item.id === id && item.state === "received"
      )
      if (!row) return null
      if (row.attempts >= options.maxAttempts) {
        Object.assign(row, { state: "failed", errorCode: "ATTEMPTS_EXHAUSTED" })
        return null
      }
      Object.assign(row, { state: "processing", attempts: row.attempts + 1 })
      return { ...row }
    },
    async reclaimInterruptedInbox(input) {
      let count = 0
      for (const row of inbox)
        if (
          row.provider === input.provider &&
          row.providerChatId === input.providerChatId &&
          row.state === "processing"
        ) {
          Object.assign(row, {
            state: "received",
            errorCode: "TURN_INTERRUPTED",
          })
          count += 1
        }
      return count
    },
    async finishInbox(id, outcome) {
      const row = inbox.find(
        (item) => item.id === id && item.state === "processing"
      )
      if (!row) return
      row.state = outcome.state
      row.errorCode = outcome.errorCode ?? null
      if (outcome.linkId !== undefined) row.linkId = outcome.linkId
    },
    async listOutbox(input) {
      return outbox
        .filter((row) => row.inboxId === input.inboxId)
        .sort((a, b) => a.sequence - b.sequence)
        .map((row) => ({ ...row }))
    },
    async enqueueOutbox(rows) {
      const saved: AssistantChannelOutboxRow[] = []
      for (const input of rows) {
        const existing = input.inboxId
          ? outbox.find(
              (row) =>
                row.inboxId === input.inboxId && row.sequence === input.sequence
            )
          : undefined
        if (existing) {
          saved.push({ ...existing })
          continue
        }
        const row = {
          id: randomUUID(),
          provider: input.provider,
          providerChatId: input.providerChatId,
          linkId: input.linkId,
          inboxId: input.inboxId,
          sequence: input.sequence,
          payload: structuredClone(input.payload),
          state: "pending" as const,
          attempts: 0,
          providerMessageId: null,
          errorCode: null,
          createdAt: clock++,
        }
        outbox.push(row)
        saved.push({ ...row })
      }
      return saved
    },
    async getOutbox(id) {
      const row = outbox.find((item) => item.id === id)
      return row ? { ...row } : null
    },
    async nextPendingOutbox(input) {
      const row = outbox
        .filter(
          (item) =>
            item.provider === input.provider &&
            item.providerChatId === input.providerChatId &&
            item.state === "pending"
        )
        .sort((a, b) => a.createdAt - b.createdAt || a.sequence - b.sequence)[0]
      return row ? { ...row } : null
    },
    async reconcileInterruptedSends(input) {
      let count = 0
      for (const row of outbox)
        if (
          row.provider === input.provider &&
          row.providerChatId === input.providerChatId &&
          row.state === "sending"
        ) {
          Object.assign(row, { state: "unknown", errorCode: "SEND_INTERRUPTED" })
          count += 1
        }
      return count
    },
    async beginSend(id) {
      const row = outbox.find((item) => item.id === id)
      if (!row || row.state !== "pending") return { status: "not_pending" }
      const link = row.linkId
        ? links.find((item) => item.id === row.linkId)
        : null
      if (row.linkId && link?.status !== "active") {
        Object.assign(row, { state: "failed", errorCode: "LINK_REVOKED" })
        return { status: "link_revoked" }
      }
      Object.assign(row, { state: "sending", attempts: row.attempts + 1 })
      return { status: "started", row: { ...row } }
    },
    async finishSend(id, outcome, options) {
      const row = outbox.find((item) => item.id === id)
      if (!row || row.state !== "sending") return row ? { ...row } : null
      if (outcome.kind === "sent")
        Object.assign(row, {
          state: "sent",
          providerMessageId: outcome.providerMessageId,
          errorCode: null,
        })
      else if (outcome.kind === "unknown")
        Object.assign(row, { state: "unknown", errorCode: outcome.errorCode })
      else
        Object.assign(row, {
          state:
            outcome.retryable && row.attempts < options.maxAttempts
              ? "pending"
              : "failed",
          errorCode: outcome.errorCode,
        })
      return { ...row }
    },
  }
  return { store, challenges, links, inbox, outbox, conversations }
}
