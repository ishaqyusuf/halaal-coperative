import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"

/**
 * Persistence for the WhatsApp and Telegram assistant channels: link
 * challenges, active links, durable inbox and outbox. Every write is a
 * conditional state change, so retries and races resolve to one outcome.
 * Plan: .brain/plans/2026-11-13-cooperative-assistant.md §3 (Phase 3).
 *
 * The API depends on the `AssistantChannelStore` interface, so tests swap in
 * an in-memory store with the same rules.
 */

export type AssistantChannelProvider = "telegram" | "whatsapp"

export type AssistantChannelOwner = {
  tenantId: string
  userId: string
  membershipId: string
}

export type AssistantChannelChallengeRow = AssistantChannelOwner & {
  id: string
  provider: AssistantChannelProvider
  status: "issued" | "claimed" | "confirmed" | "expired" | "cancelled"
  providerAccountDigest: string | null
  providerAccountMasked: string | null
  providerChatId: string | null
  expiresAt: Date
  claimedAt: Date | null
  confirmedAt: Date | null
}

export type AssistantChannelLinkRow = AssistantChannelOwner & {
  id: string
  provider: AssistantChannelProvider
  providerAccountDigest: string
  providerAccountMasked: string
  providerChatId: string
  conversationId: string | null
  status: "pending" | "active" | "revoked"
  confirmedAt: Date
  revokedAt: Date | null
}

export type AssistantChannelInboxRow = {
  id: string
  provider: AssistantChannelProvider
  eventId: string
  providerChatId: string
  linkId: string | null
  payload: unknown
  state: "received" | "processing" | "done" | "failed" | "ignored"
  attempts: number
  createdAt: Date
}

export type AssistantChannelOutboxRow = {
  id: string
  provider: AssistantChannelProvider
  providerChatId: string
  linkId: string | null
  inboxId: string | null
  sequence: number
  payload: unknown
  state: "pending" | "sending" | "sent" | "failed" | "unknown"
  attempts: number
  providerMessageId: string | null
  errorCode: string | null
}

/** Live authority for a link, re-read before every turn and delivery. */
export type AssistantChannelMembership = AssistantChannelOwner & {
  tenantName: string
  tenantStatus: "pending" | "active" | "suspended" | "archived"
  tenantPurging: boolean
  userDeleted: boolean
  role:
    | "super_admin"
    | "tenant_admin"
    | "finance_officer"
    | "operations_officer"
    | "member"
}

export type ClaimChallengeResult =
  | {
      status: "claimed"
      challenge: AssistantChannelChallengeRow
      tenantName: string
    }
  | { status: "invalid" | "expired" | "used" }

export type ConfirmChallengeResult =
  | {
      status: "confirmed"
      link: AssistantChannelLinkRow
      revokedLinkIds: string[]
    }
  | { status: "not_found" | "expired" | "not_claimed" }

export type AdmitInboxInput = {
  environment: string
  provider: AssistantChannelProvider
  endpointId: string
  eventId: string
  providerChatId: string
  linkId: string | null
  payload: Prisma.InputJsonValue
}

export type EnqueueOutboxInput = {
  provider: AssistantChannelProvider
  providerChatId: string
  linkId: string | null
  inboxId: string | null
  sequence: number
  payload: Prisma.InputJsonValue
}

export type BeginSendResult =
  | { status: "started"; row: AssistantChannelOutboxRow }
  | { status: "link_revoked" | "not_pending" }

export type FinishSendOutcome =
  | { kind: "sent"; providerMessageId: string }
  /** Definite rejection; retryable while attempts remain. */
  | { kind: "rejected"; errorCode: string; retryable: boolean }
  /** The provider may have received it: never resend blindly. */
  | { kind: "unknown"; errorCode: string }

export interface AssistantChannelStore {
  issueChallenge(
    input: AssistantChannelOwner & {
      provider: AssistantChannelProvider
      nonceDigest: string
      expiresAt: Date
    }
  ): Promise<{ id: string; expiresAt: Date }>
  claimChallenge(input: {
    provider: AssistantChannelProvider
    nonceDigest: string
    accountDigest: string
    accountMasked: string
    chatId: string
    now: Date
  }): Promise<ClaimChallengeResult>
  listPendingChallenges(
    input: AssistantChannelOwner & { now: Date }
  ): Promise<AssistantChannelChallengeRow[]>
  confirmChallenge(
    input: AssistantChannelOwner & { challengeId: string; now: Date }
  ): Promise<ConfirmChallengeResult>
  cancelChallenge(
    input: AssistantChannelOwner & { challengeId: string }
  ): Promise<boolean>
  listActiveLinks(input: {
    tenantId: string
    userId: string
  }): Promise<AssistantChannelLinkRow[]>
  findActiveLink(input: {
    provider: AssistantChannelProvider
    accountDigest: string
  }): Promise<AssistantChannelLinkRow | null>
  revokeLinks(
    input:
      | { linkId: string; now: Date }
      | {
          tenantId: string
          userId: string
          provider: AssistantChannelProvider
          now: Date
        }
  ): Promise<AssistantChannelLinkRow[]>
  setLinkConversation(
    linkId: string,
    conversationId: string | null
  ): Promise<void>
  resolveMembership(
    owner: AssistantChannelOwner
  ): Promise<AssistantChannelMembership | null>
  createConversation(
    owner: AssistantChannelOwner & { channel: AssistantChannelProvider }
  ): Promise<{ id: string }>
  admitInbox(
    input: AdmitInboxInput
  ): Promise<{ status: "admitted" | "duplicate"; id: string }>
  nextReceivedInbox(input: {
    provider: AssistantChannelProvider
    providerChatId: string
  }): Promise<AssistantChannelInboxRow | null>
  listReceivedInbox(input: {
    createdBefore: Date
    limit: number
  }): Promise<AssistantChannelInboxRow[]>
  leaseInbox(
    id: string,
    options: { maxAttempts: number }
  ): Promise<AssistantChannelInboxRow | null>
  finishInbox(
    id: string,
    outcome: {
      state: "received" | "done" | "failed" | "ignored"
      linkId?: string | null
      errorCode?: string | null
    }
  ): Promise<void>
  listOutbox(input: { inboxId: string }): Promise<AssistantChannelOutboxRow[]>
  enqueueOutbox(
    rows: EnqueueOutboxInput[]
  ): Promise<AssistantChannelOutboxRow[]>
  beginSend(id: string): Promise<BeginSendResult>
  finishSend(
    id: string,
    outcome: FinishSendOutcome,
    options: { maxAttempts: number; now: Date }
  ): Promise<AssistantChannelOutboxRow | null>
}

function db(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  return prisma
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    (error as { code?: string }).code === "P2002"
  )
}

const ownerWhere = (owner: AssistantChannelOwner) => ({
  tenantId: owner.tenantId,
  userId: owner.userId,
  membershipId: owner.membershipId,
})

type ChannelValue = AssistantChannelProvider

function challengeRow(row: {
  id: string
  tenantId: string
  userId: string
  membershipId: string
  provider: string
  status: string
  providerAccountDigest: string | null
  providerAccountMasked: string | null
  providerChatId: string | null
  expiresAt: Date
  claimedAt: Date | null
  confirmedAt: Date | null
}): AssistantChannelChallengeRow {
  return {
    ...row,
    provider: row.provider as ChannelValue,
    status: row.status as AssistantChannelChallengeRow["status"],
  }
}

function linkRow(row: {
  id: string
  tenantId: string
  userId: string
  membershipId: string
  provider: string
  providerAccountDigest: string
  providerAccountMasked: string
  providerChatId: string
  conversationId: string | null
  status: string
  confirmedAt: Date
  revokedAt: Date | null
}): AssistantChannelLinkRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    membershipId: row.membershipId,
    provider: row.provider as ChannelValue,
    providerAccountDigest: row.providerAccountDigest,
    providerAccountMasked: row.providerAccountMasked,
    providerChatId: row.providerChatId,
    conversationId: row.conversationId,
    status: row.status as AssistantChannelLinkRow["status"],
    confirmedAt: row.confirmedAt,
    revokedAt: row.revokedAt,
  }
}

function inboxRow(row: {
  id: string
  provider: string
  eventId: string
  providerChatId: string
  linkId: string | null
  payload: unknown
  state: string
  attempts: number
  createdAt: Date
}): AssistantChannelInboxRow {
  return {
    id: row.id,
    provider: row.provider as ChannelValue,
    eventId: row.eventId,
    providerChatId: row.providerChatId,
    linkId: row.linkId,
    payload: row.payload,
    state: row.state as AssistantChannelInboxRow["state"],
    attempts: row.attempts,
    createdAt: row.createdAt,
  }
}

function outboxRow(row: {
  id: string
  provider: string
  providerChatId: string
  linkId: string | null
  inboxId: string | null
  sequence: number
  payload: unknown
  state: string
  attempts: number
  providerMessageId: string | null
  errorCode: string | null
}): AssistantChannelOutboxRow {
  return {
    id: row.id,
    provider: row.provider as ChannelValue,
    providerChatId: row.providerChatId,
    linkId: row.linkId,
    inboxId: row.inboxId,
    sequence: row.sequence,
    payload: row.payload,
    state: row.state as AssistantChannelOutboxRow["state"],
    attempts: row.attempts,
    providerMessageId: row.providerMessageId,
    errorCode: row.errorCode,
  }
}

/** Prisma implementation of the channel store. */
export function createPrismaAssistantChannelStore(
  prismaOverride?: PrismaClient
): AssistantChannelStore {
  const client = () => db(prismaOverride)

  return {
    async issueChallenge(input) {
      return client().$transaction(async (tx) => {
        // One open challenge per owner and provider: a new link closes older ones.
        await tx.assistantChannelChallenge.updateMany({
          where: {
            ...ownerWhere(input),
            provider: input.provider,
            status: { in: ["issued", "claimed"] },
          },
          data: { status: "cancelled" },
        })
        return tx.assistantChannelChallenge.create({
          data: {
            ...ownerWhere(input),
            provider: input.provider,
            nonceDigest: input.nonceDigest,
            expiresAt: input.expiresAt,
          },
          select: { id: true, expiresAt: true },
        })
      })
    },

    async claimChallenge(input) {
      const prisma = client()
      const challenge = await prisma.assistantChannelChallenge.findUnique({
        where: { nonceDigest: input.nonceDigest },
        include: { tenant: { select: { name: true } } },
      })
      if (!challenge || challenge.provider !== input.provider)
        return { status: "invalid" }
      if (challenge.status !== "issued") return { status: "used" }
      if (challenge.expiresAt <= input.now) {
        await prisma.assistantChannelChallenge.updateMany({
          where: { id: challenge.id, status: "issued" },
          data: { status: "expired" },
        })
        return { status: "expired" }
      }
      const claimed = await prisma.assistantChannelChallenge.updateMany({
        where: {
          id: challenge.id,
          status: "issued",
          expiresAt: { gt: input.now },
        },
        data: {
          status: "claimed",
          claimedAt: input.now,
          providerAccountDigest: input.accountDigest,
          providerAccountMasked: input.accountMasked,
          providerChatId: input.chatId,
        },
      })
      if (claimed.count !== 1) return { status: "used" }
      return {
        status: "claimed",
        tenantName: challenge.tenant.name,
        challenge: challengeRow({
          ...challenge,
          status: "claimed",
          claimedAt: input.now,
          providerAccountDigest: input.accountDigest,
          providerAccountMasked: input.accountMasked,
          providerChatId: input.chatId,
        }),
      }
    },

    async listPendingChallenges(input) {
      const rows = await client().assistantChannelChallenge.findMany({
        where: {
          ...ownerWhere(input),
          status: "claimed",
          expiresAt: { gt: input.now },
        },
        orderBy: { claimedAt: "desc" },
        take: 5,
      })
      return rows.map(challengeRow)
    },

    async confirmChallenge(input) {
      return client().$transaction(async (tx) => {
        const challenge = await tx.assistantChannelChallenge.findFirst({
          where: { id: input.challengeId, ...ownerWhere(input) },
        })
        if (!challenge) return { status: "not_found" as const }
        if (
          challenge.status !== "claimed" ||
          !challenge.providerAccountDigest ||
          !challenge.providerAccountMasked ||
          !challenge.providerChatId
        )
          return { status: "not_claimed" as const }
        if (challenge.expiresAt <= input.now) {
          await tx.assistantChannelChallenge.updateMany({
            where: { id: challenge.id, status: "claimed" },
            data: { status: "expired" },
          })
          return { status: "expired" as const }
        }
        const confirmed = await tx.assistantChannelChallenge.updateMany({
          where: { id: challenge.id, status: "claimed" },
          data: { status: "confirmed", confirmedAt: input.now },
        })
        if (confirmed.count !== 1) return { status: "not_claimed" as const }

        // One active link per provider account, and one per owner and provider.
        const previous = await tx.assistantChannelLink.findMany({
          where: {
            status: "active",
            provider: challenge.provider,
            OR: [
              { providerAccountDigest: challenge.providerAccountDigest },
              { tenantId: input.tenantId, userId: input.userId },
            ],
          },
          select: { id: true },
        })
        if (previous.length)
          await tx.assistantChannelLink.updateMany({
            where: { id: { in: previous.map((row) => row.id) } },
            data: { status: "revoked", revokedAt: input.now },
          })
        const link = await tx.assistantChannelLink.create({
          data: {
            ...ownerWhere(input),
            provider: challenge.provider,
            providerAccountDigest: challenge.providerAccountDigest,
            providerAccountMasked: challenge.providerAccountMasked,
            providerChatId: challenge.providerChatId,
            confirmedAt: input.now,
          },
        })
        return {
          status: "confirmed" as const,
          link: linkRow(link),
          revokedLinkIds: previous.map((row) => row.id),
        }
      })
    },

    async cancelChallenge(input) {
      const result = await client().assistantChannelChallenge.updateMany({
        where: {
          id: input.challengeId,
          ...ownerWhere(input),
          status: { in: ["issued", "claimed"] },
        },
        data: { status: "cancelled" },
      })
      return result.count === 1
    },

    async listActiveLinks(input) {
      const rows = await client().assistantChannelLink.findMany({
        where: {
          tenantId: input.tenantId,
          userId: input.userId,
          status: "active",
        },
        orderBy: { confirmedAt: "desc" },
      })
      return rows.map(linkRow)
    },

    async findActiveLink(input) {
      const row = await client().assistantChannelLink.findFirst({
        where: {
          provider: input.provider,
          providerAccountDigest: input.accountDigest,
          status: "active",
        },
        orderBy: { confirmedAt: "desc" },
      })
      return row ? linkRow(row) : null
    },

    async revokeLinks(input) {
      return client().$transaction(async (tx) => {
        const where =
          "linkId" in input
            ? { id: input.linkId, status: "active" as const }
            : {
                tenantId: input.tenantId,
                userId: input.userId,
                provider: input.provider,
                status: "active" as const,
              }
        const rows = await tx.assistantChannelLink.findMany({ where })
        if (!rows.length) return []
        await tx.assistantChannelLink.updateMany({
          where: { id: { in: rows.map((row) => row.id) }, status: "active" },
          data: { status: "revoked", revokedAt: input.now },
        })
        return rows.map((row) =>
          linkRow({ ...row, status: "revoked", revokedAt: input.now })
        )
      })
    },

    async setLinkConversation(linkId, conversationId) {
      await client().assistantChannelLink.updateMany({
        where: { id: linkId, status: "active" },
        data: { conversationId },
      })
    },

    async resolveMembership(owner) {
      const membership = await client().membership.findFirst({
        where: {
          id: owner.membershipId,
          tenantId: owner.tenantId,
          userId: owner.userId,
        },
        select: {
          id: true,
          role: true,
          tenantId: true,
          userId: true,
          tenant: {
            select: { name: true, status: true, qaPurgeStartedAt: true },
          },
          user: { select: { deletedAt: true } },
        },
      })
      if (!membership) return null
      return {
        tenantId: membership.tenantId,
        userId: membership.userId,
        membershipId: membership.id,
        role: membership.role,
        tenantName: membership.tenant.name,
        tenantStatus: membership.tenant.status,
        tenantPurging: Boolean(membership.tenant.qaPurgeStartedAt),
        userDeleted: Boolean(membership.user.deletedAt),
      }
    },

    async createConversation(owner) {
      return client().assistantConversation.create({
        data: { ...ownerWhere(owner), channel: owner.channel },
        select: { id: true },
      })
    },

    async admitInbox(input) {
      const prisma = client()
      try {
        const row = await prisma.assistantChannelInbox.create({
          data: input,
          select: { id: true },
        })
        return { status: "admitted", id: row.id }
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
        const existing = await prisma.assistantChannelInbox.findUniqueOrThrow({
          where: {
            environment_provider_endpointId_eventId: {
              environment: input.environment,
              provider: input.provider,
              endpointId: input.endpointId,
              eventId: input.eventId,
            },
          },
          select: { id: true },
        })
        return { status: "duplicate", id: existing.id }
      }
    },

    async nextReceivedInbox(input) {
      const row = await client().assistantChannelInbox.findFirst({
        where: {
          provider: input.provider,
          providerChatId: input.providerChatId,
          state: "received",
        },
        orderBy: { createdAt: "asc" },
      })
      return row ? inboxRow(row) : null
    },

    async listReceivedInbox(input) {
      const rows = await client().assistantChannelInbox.findMany({
        where: {
          state: "received",
          createdAt: { lt: input.createdBefore },
        },
        orderBy: { createdAt: "asc" },
        take: Math.min(Math.max(input.limit, 1), 100),
      })
      return rows.map(inboxRow)
    },

    async leaseInbox(id, options) {
      const prisma = client()
      const leased = await prisma.assistantChannelInbox.updateMany({
        where: {
          id,
          state: "received",
          attempts: { lt: options.maxAttempts },
        },
        data: { state: "processing", attempts: { increment: 1 } },
      })
      if (leased.count !== 1) {
        await prisma.assistantChannelInbox.updateMany({
          where: {
            id,
            state: "received",
            attempts: { gte: options.maxAttempts },
          },
          data: { state: "failed", errorCode: "ATTEMPTS_EXHAUSTED" },
        })
        return null
      }
      const row = await prisma.assistantChannelInbox.findUnique({
        where: { id },
      })
      return row ? inboxRow(row) : null
    },

    async finishInbox(id, outcome) {
      await client().assistantChannelInbox.updateMany({
        where: { id, state: "processing" },
        data: {
          state: outcome.state,
          ...(outcome.linkId !== undefined ? { linkId: outcome.linkId } : {}),
          errorCode: outcome.errorCode ?? null,
          processedAt: outcome.state === "received" ? null : new Date(),
        },
      })
    },

    async listOutbox(input) {
      const rows = await client().assistantChannelOutbox.findMany({
        where: { inboxId: input.inboxId },
        orderBy: { sequence: "asc" },
      })
      return rows.map(outboxRow)
    },

    async enqueueOutbox(rows) {
      if (!rows.length) return []
      const prisma = client()
      // Idempotent on (inboxId, sequence): a retried turn never adds a second copy.
      await prisma.assistantChannelOutbox.createMany({
        data: rows,
        skipDuplicates: true,
      })
      const inboxIds = [
        ...new Set(rows.map((row) => row.inboxId).filter(Boolean)),
      ] as string[]
      const saved = await prisma.assistantChannelOutbox.findMany({
        where: inboxIds.length
          ? { inboxId: { in: inboxIds } }
          : {
              inboxId: null,
              providerChatId: { in: rows.map((row) => row.providerChatId) },
              state: "pending",
            },
        orderBy: [{ createdAt: "asc" }, { sequence: "asc" }],
      })
      return saved.map(outboxRow)
    },

    async beginSend(id) {
      return client().$transaction(async (tx) => {
        const row = await tx.assistantChannelOutbox.findUnique({
          where: { id },
          include: { link: { select: { status: true } } },
        })
        if (!row || row.state !== "pending")
          return { status: "not_pending" as const }
        // A revoked link stops delivery of anything still queued for it.
        if (row.linkId && row.link?.status !== "active") {
          await tx.assistantChannelOutbox.updateMany({
            where: { id, state: "pending" },
            data: { state: "failed", errorCode: "LINK_REVOKED" },
          })
          return { status: "link_revoked" as const }
        }
        const started = await tx.assistantChannelOutbox.updateMany({
          where: { id, state: "pending" },
          data: { state: "sending", attempts: { increment: 1 } },
        })
        if (started.count !== 1) return { status: "not_pending" as const }
        return {
          status: "started" as const,
          row: outboxRow({
            ...row,
            state: "sending",
            attempts: row.attempts + 1,
          }),
        }
      })
    },

    async finishSend(id, outcome, options) {
      const prisma = client()
      const row = await prisma.assistantChannelOutbox.findUnique({
        where: { id },
      })
      if (!row || row.state !== "sending") return row ? outboxRow(row) : null
      const data =
        outcome.kind === "sent"
          ? {
              state: "sent" as const,
              providerMessageId: outcome.providerMessageId,
              sentAt: options.now,
              errorCode: null,
            }
          : outcome.kind === "unknown"
            ? { state: "unknown" as const, errorCode: outcome.errorCode }
            : {
                state:
                  outcome.retryable && row.attempts < options.maxAttempts
                    ? ("pending" as const)
                    : ("failed" as const),
                errorCode: outcome.errorCode,
              }
      await prisma.assistantChannelOutbox.updateMany({
        where: { id, state: "sending" },
        data,
      })
      return outboxRow({ ...row, ...data })
    },
  }
}
