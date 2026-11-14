import { ExpectedQueryError } from "../query-error"
import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"

/**
 * Assistant persistence and scoped reads. Every function takes an explicit
 * owner scope; nothing here trusts a client-supplied tenant, user or role.
 * Plan: .brain/plans/2026-11-13-cooperative-assistant.md §3.
 */

export type AssistantOwnerScope = {
  tenantId: string
  userId: string
  membershipId: string
}

export type AssistantChannelValue = "web" | "native" | "whatsapp" | "telegram"

function db(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  return prisma
}

const ownerWhere = (scope: AssistantOwnerScope) => ({
  tenantId: scope.tenantId,
  userId: scope.userId,
  membershipId: scope.membershipId,
})

// ---------------------------------------------------------------------------
// Conversations and messages
// ---------------------------------------------------------------------------

export async function createAssistantConversation(
  scope: AssistantOwnerScope & { channel: AssistantChannelValue },
  prismaOverride?: PrismaClient
) {
  return db(prismaOverride).assistantConversation.create({
    data: { ...ownerWhere(scope), channel: scope.channel },
    select: { id: true, title: true, channel: true, updatedAt: true },
  })
}

/** Web and native share one history; messaging chats stay separate. */
function channelFilter(channel: AssistantChannelValue) {
  return channel === "web" || channel === "native"
    ? { in: ["web", "native"] as AssistantChannelValue[] }
    : { equals: channel }
}

export async function listAssistantConversations(
  scope: AssistantOwnerScope & {
    channel: AssistantChannelValue
    cursor?: string | null
    limit?: number
  },
  prismaOverride?: PrismaClient
) {
  const limit = Math.min(Math.max(scope.limit ?? 20, 1), 50)
  const rows = await db(prismaOverride).assistantConversation.findMany({
    where: {
      ...ownerWhere(scope),
      archivedAt: null,
      channel: channelFilter(scope.channel),
    },
    orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(scope.cursor ? { cursor: { id: scope.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      channel: true,
      lastMessageAt: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { parts: true },
      },
    },
  })
  const page = rows.slice(0, limit)
  return {
    items: page.map((row) => ({
      id: row.id,
      title: row.title,
      channel: row.channel,
      updatedAt: row.lastMessageAt.toISOString(),
      lastMessagePreview: previewOf(row.messages[0]?.parts),
    })),
    nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null,
  }
}

function previewOf(parts: unknown): string | null {
  if (!Array.isArray(parts)) return null
  const text = parts.find(
    (part): part is { type: "text"; text: string } =>
      Boolean(part) &&
      typeof part === "object" &&
      (part as { type?: unknown }).type === "text"
  )
  return text ? text.text.slice(0, 120) : null
}

export async function readAssistantConversation(
  scope: AssistantOwnerScope & { conversationId: string },
  prismaOverride?: PrismaClient
) {
  return db(prismaOverride).assistantConversation.findFirst({
    where: { ...ownerWhere(scope), id: scope.conversationId, archivedAt: null },
    select: {
      id: true,
      title: true,
      channel: true,
      lastMessageAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { id: true, role: true, parts: true, createdAt: true },
      },
    },
  })
}

export async function archiveAssistantConversation(
  scope: AssistantOwnerScope & { conversationId: string },
  prismaOverride?: PrismaClient
) {
  const result = await db(prismaOverride).assistantConversation.updateMany({
    where: { ...ownerWhere(scope), id: scope.conversationId, archivedAt: null },
    data: { archivedAt: new Date() },
  })
  if (result.count === 0)
    throw ExpectedQueryError.notFound("Chat not found.")
}

// ---------------------------------------------------------------------------
// Turns (one user message → one reply, replay-safe by requestId)
// ---------------------------------------------------------------------------

export type AssistantStoredMessage = {
  id: string
  role: "user" | "assistant"
  parts: unknown
  createdAt: Date
}

export type BeginAssistantTurnResult =
  | { kind: "started"; turnId: string; userMessage: AssistantStoredMessage }
  | {
      kind: "replay"
      userMessage: AssistantStoredMessage
      reply: AssistantStoredMessage | null
      status: "running" | "completed" | "failed"
    }

/**
 * Serializes turns per conversation (row lock) and dedupes by requestId.
 * No model or provider work happens inside this transaction.
 */
export async function beginAssistantTurn(
  input: AssistantOwnerScope & {
    conversationId: string
    requestId: string
    userParts: unknown[]
    title: string | null
  },
  prismaOverride?: PrismaClient
): Promise<BeginAssistantTurnResult> {
  return db(prismaOverride).$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "assistant_conversations"
      WHERE "id" = ${input.conversationId}::uuid
        AND "tenant_id" = ${input.tenantId}::uuid
        AND "user_id" = ${input.userId}::uuid
        AND "membership_id" = ${input.membershipId}::uuid
        AND "archived_at" IS NULL
      FOR UPDATE`
    if (locked.length === 0)
      throw ExpectedQueryError.notFound("Chat not found.")

    const existing = await tx.assistantTurn.findUnique({
      where: {
        conversationId_requestId: {
          conversationId: input.conversationId,
          requestId: input.requestId,
        },
      },
    })
    if (existing) {
      const [userMessage, reply] = await Promise.all([
        existing.userMessageId
          ? tx.assistantMessage.findUnique({ where: { id: existing.userMessageId } })
          : null,
        existing.replyMessageId
          ? tx.assistantMessage.findUnique({ where: { id: existing.replyMessageId } })
          : null,
      ])
      if (!userMessage)
        throw ExpectedQueryError.conflict("This message is still being saved.")
      return {
        kind: "replay",
        userMessage,
        reply,
        status: existing.status,
      }
    }

    const running = await tx.assistantTurn.findFirst({
      where: { conversationId: input.conversationId, status: "running" },
      select: { id: true, createdAt: true },
    })
    // A stale running turn (crashed process) does not block the chat forever.
    if (running && Date.now() - running.createdAt.getTime() < 60_000)
      throw ExpectedQueryError.conflict(
        "A reply is already running. Wait for it before sending again."
      )
    if (running)
      await tx.assistantTurn.update({
        where: { id: running.id },
        data: { status: "failed", errorCode: "STALE", completedAt: new Date() },
      })

    const userMessage = await tx.assistantMessage.create({
      data: {
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        role: "user",
        parts: input.userParts as object[],
      },
    })
    const turn = await tx.assistantTurn.create({
      data: {
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        requestId: input.requestId,
        userMessageId: userMessage.id,
      },
      select: { id: true },
    })
    await tx.assistantConversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageAt: userMessage.createdAt,
        ...(input.title ? { title: input.title } : {}),
      },
    })
    return { kind: "started", turnId: turn.id, userMessage }
  })
}

export async function completeAssistantTurn(
  input: {
    turnId: string
    tenantId: string
    conversationId: string
    status: "completed" | "failed"
    replyParts: unknown[]
    capabilityId: string | null
    provider: string | null
    model: string | null
    errorCode?: string | null
    durationMs: number
  },
  prismaOverride?: PrismaClient
) {
  return db(prismaOverride).$transaction(async (tx) => {
    const reply = await tx.assistantMessage.create({
      data: {
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        role: "assistant",
        parts: input.replyParts as object[],
      },
    })
    await tx.assistantTurn.update({
      where: { id: input.turnId },
      data: {
        status: input.status,
        replyMessageId: reply.id,
        capabilityId: input.capabilityId,
        provider: input.provider,
        model: input.model,
        errorCode: input.errorCode ?? null,
        durationMs: input.durationMs,
        completedAt: new Date(),
      },
    })
    await tx.assistantConversation.update({
      where: { id: input.conversationId },
      data: { lastMessageAt: reply.createdAt },
    })
    return reply
  })
}

/** Recent text-only history for the optional model path. */
export async function listAssistantHistory(
  input: { conversationId: string; limit?: number },
  prismaOverride?: PrismaClient
) {
  const rows = await db(prismaOverride).assistantMessage.findMany({
    where: { conversationId: input.conversationId },
    orderBy: { createdAt: "desc" },
    take: input.limit ?? 20,
    select: { role: true, parts: true },
  })
  return rows.reverse()
}

// ---------------------------------------------------------------------------
// Proposals (exact-draft state machine)
// ---------------------------------------------------------------------------

export type AssistantProposalRow = {
  id: string
  tenantId: string
  conversationId: string
  actorUserId: string
  membershipId: string
  capabilityId: string
  kind: string
  revision: number
  status: "collecting" | "review" | "confirmed" | "cancelled" | "expired" | "refused"
  fields: unknown
  expiresAt: Date
  confirmationKey: string | null
  confirmedRevision: number | null
  result: unknown
  resultReference: string | null
}

export async function createAssistantProposal(
  input: AssistantOwnerScope & {
    conversationId: string
    capabilityId: string
    kind: string
    status: "collecting" | "review"
    fields: unknown
    expiresAt: Date
  },
  prismaOverride?: PrismaClient
): Promise<AssistantProposalRow> {
  return db(prismaOverride).assistantProposal.create({
    data: {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      actorUserId: input.userId,
      membershipId: input.membershipId,
      capabilityId: input.capabilityId,
      kind: input.kind,
      status: input.status,
      fields: input.fields as object,
      expiresAt: input.expiresAt,
    },
  }) as Promise<AssistantProposalRow>
}

export async function readAssistantProposal(
  scope: AssistantOwnerScope & { proposalId: string },
  prismaOverride?: PrismaClient
): Promise<AssistantProposalRow | null> {
  return db(prismaOverride).assistantProposal.findFirst({
    where: {
      id: scope.proposalId,
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      membershipId: scope.membershipId,
    },
  }) as Promise<AssistantProposalRow | null>
}

export async function listConversationProposals(
  scope: AssistantOwnerScope & { conversationId: string },
  prismaOverride?: PrismaClient
): Promise<AssistantProposalRow[]> {
  return db(prismaOverride).assistantProposal.findMany({
    where: {
      conversationId: scope.conversationId,
      tenantId: scope.tenantId,
      actorUserId: scope.userId,
      membershipId: scope.membershipId,
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  }) as Promise<AssistantProposalRow[]>
}

/** Optimistic revision bump: an edit invalidates the old review. */
export async function reviseAssistantProposal(
  input: AssistantOwnerScope & {
    proposalId: string
    expectedRevision: number
    fields: unknown
    status: "collecting" | "review"
    expiresAt: Date
  },
  prismaOverride?: PrismaClient
) {
  const result = await db(prismaOverride).assistantProposal.updateMany({
    where: {
      id: input.proposalId,
      tenantId: input.tenantId,
      actorUserId: input.userId,
      membershipId: input.membershipId,
      revision: input.expectedRevision,
      status: { in: ["collecting", "review"] },
    },
    data: {
      fields: input.fields as object,
      status: input.status,
      expiresAt: input.expiresAt,
      revision: { increment: 1 },
    },
  })
  if (result.count === 0)
    throw ExpectedQueryError.conflict(
      "This draft changed or is no longer open. Review the latest version."
    )
}

export async function setAssistantProposalStatus(
  input: AssistantOwnerScope & {
    proposalId: string
    from: AssistantProposalRow["status"][]
    to: "cancelled" | "expired" | "refused"
  },
  prismaOverride?: PrismaClient
) {
  const result = await db(prismaOverride).assistantProposal.updateMany({
    where: {
      id: input.proposalId,
      tenantId: input.tenantId,
      actorUserId: input.userId,
      membershipId: input.membershipId,
      status: { in: input.from },
    },
    data: { status: input.to },
  })
  return result.count > 0
}

/**
 * Claims the exact reviewed revision for one confirming write. Returns the
 * saved result when the same actor retries with the same key, and refuses a
 * different key, stale revision, expired or non-review draft.
 */
export async function claimAssistantProposalConfirmation(
  input: AssistantOwnerScope & {
    proposalId: string
    revision: number
    confirmationKey: string
    now?: Date
  },
  prismaOverride?: PrismaClient
): Promise<
  | { kind: "claimed"; proposal: AssistantProposalRow }
  | { kind: "already"; proposal: AssistantProposalRow }
  | { kind: "refused"; reason: "stale" | "expired" | "closed" | "other_key" }
> {
  const prisma = db(prismaOverride)
  const now = input.now ?? new Date()
  const proposal = (await prisma.assistantProposal.findFirst({
    where: {
      id: input.proposalId,
      tenantId: input.tenantId,
      actorUserId: input.userId,
      membershipId: input.membershipId,
    },
  })) as AssistantProposalRow | null
  if (!proposal) throw ExpectedQueryError.notFound("Draft not found.")
  if (proposal.confirmationKey) {
    return proposal.confirmationKey === input.confirmationKey &&
      proposal.confirmedRevision === input.revision
      ? { kind: "already", proposal }
      : { kind: "refused", reason: "other_key" }
  }
  if (proposal.status !== "review") return { kind: "refused", reason: "closed" }
  if (proposal.revision !== input.revision)
    return { kind: "refused", reason: "stale" }
  if (proposal.expiresAt <= now) {
    await prisma.assistantProposal.updateMany({
      where: { id: proposal.id, status: "review" },
      data: { status: "expired" },
    })
    return { kind: "refused", reason: "expired" }
  }
  const claimed = await prisma.assistantProposal.updateMany({
    where: {
      id: proposal.id,
      revision: input.revision,
      status: "review",
      confirmationKey: null,
    },
    data: {
      confirmationKey: input.confirmationKey,
      confirmedRevision: input.revision,
    },
  })
  if (claimed.count === 0) return { kind: "refused", reason: "other_key" }
  return {
    kind: "claimed",
    proposal: { ...proposal, confirmationKey: input.confirmationKey, confirmedRevision: input.revision },
  }
}

export async function saveAssistantProposalResult(
  input: {
    proposalId: string
    confirmationKey: string
    outcome: "saved" | "not_saved"
    result: unknown
    resultReference: string | null
  },
  prismaOverride?: PrismaClient
) {
  await db(prismaOverride).assistantProposal.updateMany({
    where: { id: input.proposalId, confirmationKey: input.confirmationKey },
    data:
      input.outcome === "saved"
        ? {
            status: "confirmed",
            result: input.result as object,
            resultReference: input.resultReference,
          }
        : {
            // Release the claim so a fresh review can be confirmed later.
            status: "refused",
            result: input.result as object,
          },
  })
}

// ---------------------------------------------------------------------------
// Scoped cooperative reads (reuse statement/receipt sources; no invented totals)
// ---------------------------------------------------------------------------

/** The member profile linked to this signed-in user in this tenant. */
export async function findAssistantMember(
  input: { tenantId: string; userId: string },
  prismaOverride?: PrismaClient
) {
  return db(prismaOverride).member.findFirst({
    where: { tenantId: input.tenantId, userId: input.userId },
    select: { id: true, memberNumber: true, fullName: true, status: true },
  })
}

export async function readAssistantMemberFinancing(
  input: { tenantId: string; memberId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = db(prismaOverride)
  const [requests, loans] = await Promise.all([
    prisma.loanRequest.findMany({
      where: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        status: { in: ["submitted", "under_review", "approved"] },
        loan: null,
      },
      orderBy: { requestedAt: "desc" },
      take: 5,
      select: {
        id: true,
        requestedAmount: true,
        status: true,
        loanProduct: { select: { name: true } },
        guarantorApprovals: { select: { status: true } },
      },
    }),
    prisma.loan.findMany({
      where: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        status: { in: ["approved", "disbursed", "active", "defaulted"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        principalAmount: true,
        outstandingPrincipal: true,
        loanProduct: { select: { name: true } },
        repaymentScheduleItems: {
          where: { status: { in: ["pending", "due", "overdue", "partially_paid"] } },
          orderBy: { dueAt: "asc" },
          take: 1,
          select: { dueAt: true, totalDue: true, amountPaid: true, status: true },
        },
      },
    }),
  ])
  return { requests, loans }
}

export async function readAssistantMemberReceipts(
  input: { tenantId: string; memberId: string; limit?: number },
  prismaOverride?: PrismaClient
) {
  return db(prismaOverride).memberPaymentReceipt.findMany({
    where: { tenantId: input.tenantId, memberId: input.memberId },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    take: Math.min(input.limit ?? 5, 20),
    select: {
      id: true,
      totalAmount: true,
      submittedAt: true,
      status: true,
      reviewNotes: true,
      paymentReference: true,
    },
  })
}

export async function searchAssistantMembers(
  input: { tenantId: string; query: string; limit?: number },
  prismaOverride?: PrismaClient
) {
  const query = input.query.trim().slice(0, 80)
  if (!query) return { items: [], truncated: false }
  const limit = Math.min(input.limit ?? 5, 10)
  const rows = await db(prismaOverride).member.findMany({
    where: {
      tenantId: input.tenantId,
      OR: [
        { memberNumber: { equals: query, mode: "insensitive" } },
        { fullName: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    take: limit + 1,
    select: {
      id: true,
      memberNumber: true,
      fullName: true,
      status: true,
      deductionSource: { select: { name: true } },
    },
  })
  return { items: rows.slice(0, limit), truncated: rows.length > limit }
}

export async function readAssistantReceiptQueue(
  input: { tenantId: string; limit?: number },
  prismaOverride?: PrismaClient
) {
  const prisma = db(prismaOverride)
  const [pendingCount, correctionCount, items] = await Promise.all([
    prisma.memberPaymentReceipt.count({
      where: { tenantId: input.tenantId, status: { in: ["submitted", "under_review"] } },
    }),
    prisma.memberPaymentReceipt.count({
      where: { tenantId: input.tenantId, status: "correction_requested" },
    }),
    prisma.memberPaymentReceipt.findMany({
      where: {
        tenantId: input.tenantId,
        status: { in: ["submitted", "under_review", "correction_requested"] },
      },
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
      take: Math.min(input.limit ?? 5, 20),
      select: {
        id: true,
        totalAmount: true,
        submittedAt: true,
        status: true,
        member: { select: { fullName: true, memberNumber: true } },
      },
    }),
  ])
  return { pendingCount, correctionCount, items }
}

/** Active plan and loan target for a reviewed staff payment draft. */
export async function readAssistantPaymentTargets(
  input: { tenantId: string; memberId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = db(prismaOverride)
  const [member, plan, loan] = await Promise.all([
    prisma.member.findFirst({
      where: { id: input.memberId, tenantId: input.tenantId },
      select: {
        id: true,
        memberNumber: true,
        fullName: true,
        paymentAllocationPreference: true,
      },
    }),
    prisma.contributionPlan.findFirst({
      where: { tenantId: input.tenantId, memberId: input.memberId, isActive: true },
      orderBy: { startsAt: "desc" },
      select: { id: true, amount: true },
    }),
    prisma.loan.findFirst({
      where: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        status: { in: ["disbursed", "active", "defaulted"] },
      },
      orderBy: { disbursedAt: "asc" },
      select: {
        id: true,
        loanProduct: { select: { name: true } },
        repaymentScheduleItems: {
          where: { status: { in: ["pending", "due", "overdue", "partially_paid"] } },
          orderBy: { dueAt: "asc" },
          take: 1,
          select: { totalDue: true, amountPaid: true },
        },
      },
    }),
  ])
  return { member, plan, loan }
}
