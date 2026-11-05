import { createAuthEvidenceToken, hashAuthEvidence } from "@halaalvest/auth"
import type { PrismaClient } from "../../generated/prisma/client"
import { AppError } from "@halaalvest/errors"
import { createPrismaClient } from "../prisma"
import { auditAuthEvent } from "./auth-challenge-audit"
import { createAuthChallenge } from "./mobile-account-access"

/**
 * One-time sign-in handoff from marketing onboarding to the new tenant
 * dashboard. Only the HMAC of the token is stored; the raw token travels once,
 * in a POST body, and is never logged, emailed or put in a URL.
 */
export const workspaceSessionHandoffPurpose = "workspace_session_handoff"
export const workspaceSessionHandoffTtlMs = 3 * 60 * 1000
const maxHandoffTokenLength = 128

function requirePrisma(operation: string, override?: PrismaClient) {
  const prisma = override ?? createPrismaClient()
  if (!prisma) {
    throw new AppError({
      code: "UNEXPECTED",
      internalMessage: "Database not configured",
      operation,
    })
  }
  return prisma
}

export type WorkspaceSessionHandoff = {
  expiresAt: Date
  token: string
}

export type ConsumedWorkspaceSessionHandoff = {
  challengeId: string
  userId: string
}

/**
 * Issues a 3-minute, single-attempt handoff token for the tenant owner.
 * Supersedes any earlier unconsumed handoff for the same tenant and user and
 * writes the `auth.workspace_session_handoff.requested` audit row.
 */
export async function createWorkspaceSessionHandoff(
  input: { tenantId: string; userId: string },
  prismaOverride?: PrismaClient
): Promise<WorkspaceSessionHandoff> {
  const token = createAuthEvidenceToken()
  const challenge = await createAuthChallenge(
    {
      evidenceHash: hashAuthEvidence(token),
      expiresAt: new Date(Date.now() + workspaceSessionHandoffTtlMs),
      maxAttempts: 1,
      purpose: workspaceSessionHandoffPurpose,
      tenantId: input.tenantId,
      userId: input.userId,
    },
    prismaOverride
  )

  return { expiresAt: challenge.expiresAt, token }
}

/**
 * Burns a handoff token for the host tenant in one transaction: a single
 * conditional UPDATE ... RETURNING plus the
 * `auth.workspace_session_handoff.consumed` audit row. Returns null when the
 * token is malformed, unknown, for another tenant, expired, already consumed,
 * out of attempts, or has no user.
 */
export async function consumeWorkspaceSessionHandoff(
  input: { tenantId: string; token: string },
  prismaOverride?: PrismaClient
): Promise<ConsumedWorkspaceSessionHandoff | null> {
  const token = typeof input.token === "string" ? input.token.trim() : ""
  if (!token || token.length > maxHandoffTokenLength || !input.tenantId) {
    return null
  }

  const operation = "workspaceSessionHandoff.consume"
  const prisma = requirePrisma(operation, prismaOverride)
  const evidenceHash = hashAuthEvidence(token)
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const burned = await tx.authChallenge.updateManyAndReturn({
      data: { attemptCount: { increment: 1 }, consumedAt: now },
      select: { id: true, userId: true },
      where: {
        attemptCount: { lt: tx.authChallenge.fields.maxAttempts },
        consumedAt: null,
        evidenceHash,
        expiresAt: { gt: now },
        purpose: workspaceSessionHandoffPurpose,
        tenantId: input.tenantId,
        userId: { not: null },
      },
    })
    const challenge = burned.length === 1 ? burned[0] : null
    if (!challenge?.userId) return null

    await auditAuthEvent(tx, {
      action: `auth.${workspaceSessionHandoffPurpose}.consumed`,
      actorUserId: challenge.userId,
      entityId: challenge.id,
      tenantId: input.tenantId,
    })

    return { challengeId: challenge.id, userId: challenge.userId }
  })
}
