import type {
  AuthChallengePurpose,
  Prisma,
  PrismaClient,
} from "../../generated/prisma/client"
import { AppError } from "@halaalvest/errors"
import { timingSafeEqual } from "node:crypto"
import { createPrismaClient } from "../prisma"
import { revokeAllMobileDeviceSessionsWithClient } from "./mobile-device-sessions"

type AuthWriteClient = Prisma.TransactionClient

export type AuthRateLimitSignalType =
  | "account"
  | "device"
  | "network"
  | "tenant"

export type AuthRateLimitRule = {
  limit: number
  signalHash: string
  signalType: AuthRateLimitSignalType
  windowMs: number
}

function accountAccessError(input: {
  code:
    | "CONFLICT"
    | "NOT_FOUND"
    | "PRECONDITION_FAILED"
    | "RATE_LIMITED"
    | "UNEXPECTED"
    | "VALIDATION_FAILED"
  internalMessage: string
  operation: string
  publicMessage?: string
}) {
  return new AppError({
    code: input.code,
    internalMessage: input.internalMessage,
    operation: input.operation,
    publicMessage: input.publicMessage,
  })
}

function requirePrisma(operation: string, override?: PrismaClient) {
  const prisma = override ?? createPrismaClient()
  if (!prisma) {
    throw accountAccessError({
      code: "UNEXPECTED",
      internalMessage: "Database not configured",
      operation,
    })
  }
  return prisma
}

function evidenceMatches(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected, "hex")
  const receivedBuffer = Buffer.from(received, "hex")

  return (
    expectedBuffer.length > 0 &&
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  )
}

function floorWindow(now: Date, windowMs: number) {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs)
}

export function evaluateAuthChallengeState(input: {
  attemptCount: number
  consumedAt: Date | null
  evidenceHash: string
  expiresAt: Date
  maxAttempts: number
  now: Date
  receivedEvidenceHash: string
}) {
  if (input.consumedAt) return "consumed" as const
  if (input.expiresAt.getTime() <= input.now.getTime()) {
    return "expired" as const
  }
  if (input.attemptCount >= input.maxAttempts) {
    return "attempts_exhausted" as const
  }
  if (!evidenceMatches(input.evidenceHash, input.receivedEvidenceHash)) {
    return "invalid" as const
  }
  return "valid" as const
}

async function auditAuthEvent(
  tx: AuthWriteClient,
  input: {
    action: string
    actorUserId?: string | null
    entityId?: string | null
    metadata?: Prisma.InputJsonValue
    tenantId: string
  }
) {
  await tx.auditLog.create({
    data: {
      action: input.action,
      actorType: input.actorUserId ? "user" : "system",
      actorUserId: input.actorUserId ?? null,
      entityId: input.entityId ?? null,
      entityType: "AuthChallenge",
      metadata: input.metadata,
      occurredAt: new Date(),
      tenantId: input.tenantId,
    },
  })
}

async function createChallengeWithClient(
  tx: AuthWriteClient,
  input: {
    evidenceHash: string
    expiresAt: Date
    maxAttempts: number
    onboardingRequestId?: string | null
    purpose: AuthChallengePurpose
    tenantId: string
    userId?: string | null
  }
) {
  const now = new Date()
  await tx.authChallenge.updateMany({
    data: { consumedAt: now },
    where: {
      consumedAt: null,
      purpose: input.purpose,
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      ...(input.onboardingRequestId
        ? { onboardingRequestId: input.onboardingRequestId }
        : {}),
    },
  })

  return tx.authChallenge.create({
    data: {
      evidenceHash: input.evidenceHash,
      expiresAt: input.expiresAt,
      maxAttempts: input.maxAttempts,
      onboardingRequestId: input.onboardingRequestId ?? null,
      purpose: input.purpose,
      tenantId: input.tenantId,
      userId: input.userId ?? null,
    },
  })
}

export async function createAuthChallenge(
  input: {
    evidenceHash: string
    expiresAt: Date
    maxAttempts?: number
    onboardingRequestId?: string | null
    purpose: AuthChallengePurpose
    tenantId: string
    userId?: string | null
  },
  prismaOverride?: PrismaClient
) {
  const operation = "mobileAccountAccess.challenge.create"
  const prisma = requirePrisma(operation, prismaOverride)

  return prisma.$transaction(async (tx) => {
    const challenge = await createChallengeWithClient(tx, {
      ...input,
      maxAttempts: input.maxAttempts ?? 5,
    })
    await auditAuthEvent(tx, {
      action: `auth.${input.purpose}.requested`,
      actorUserId: input.userId,
      entityId: challenge.id,
      metadata: {
        expiresAt: challenge.expiresAt.toISOString(),
        maxAttempts: challenge.maxAttempts,
        purpose: challenge.purpose,
      },
      tenantId: input.tenantId,
    })
    return challenge
  })
}

async function getUsableChallenge(
  tx: AuthWriteClient,
  input: {
    challengeId: string
    evidenceHash: string
    purpose: AuthChallengePurpose
    tenantId: string
  }
) {
  const challenge = await tx.authChallenge.findFirst({
    where: {
      id: input.challengeId,
      purpose: input.purpose,
      tenantId: input.tenantId,
    },
  })

  if (!challenge) {
    throw accountAccessError({
      code: "NOT_FOUND",
      internalMessage: "Authentication challenge was not found in tenant.",
      operation: "mobileAccountAccess.challenge.consume",
      publicMessage: "This code is invalid or no longer available.",
    })
  }

  const state = evaluateAuthChallengeState({
    ...challenge,
    now: new Date(),
    receivedEvidenceHash: input.evidenceHash,
  })

  if (state !== "valid") {
    throw accountAccessError({
      code: state === "consumed" ? "CONFLICT" : "PRECONDITION_FAILED",
      internalMessage: `Authentication challenge rejected: ${state}.`,
      operation: "mobileAccountAccess.challenge.consume",
      publicMessage: "This code is invalid or no longer available.",
    })
  }

  return challenge
}

async function preflightAuthChallenge(
  prisma: PrismaClient,
  input: {
    challengeId: string
    evidenceHash: string
    purpose: AuthChallengePurpose
    tenantId: string
  }
) {
  const state = await prisma.$transaction(async (tx) => {
    const challenge = await tx.authChallenge.findFirst({
      where: {
        id: input.challengeId,
        purpose: input.purpose,
        tenantId: input.tenantId,
      },
    })
    if (!challenge) return "missing" as const

    const evaluated = evaluateAuthChallengeState({
      ...challenge,
      now: new Date(),
      receivedEvidenceHash: input.evidenceHash,
    })
    if (evaluated === "invalid") {
      await tx.authChallenge.updateMany({
        data: { attemptCount: { increment: 1 } },
        where: {
          attemptCount: { lt: challenge.maxAttempts },
          consumedAt: null,
          id: challenge.id,
        },
      })
      await auditAuthEvent(tx, {
        action: `auth.${input.purpose}.failed`,
        actorUserId: challenge.userId,
        entityId: challenge.id,
        metadata: { reason: "invalid_evidence" },
        tenantId: challenge.tenantId,
      })
    }
    return evaluated
  })

  if (state !== "valid") {
    throw accountAccessError({
      code: state === "consumed" ? "CONFLICT" : "PRECONDITION_FAILED",
      internalMessage: `Authentication challenge preflight rejected: ${state}.`,
      operation: "mobileAccountAccess.challenge.consume",
      publicMessage: "This code is invalid or no longer available.",
    })
  }
}

async function consumeChallenge(tx: AuthWriteClient, challengeId: string) {
  const result = await tx.authChallenge.updateMany({
    data: {
      attemptCount: { increment: 1 },
      consumedAt: new Date(),
    },
    where: { consumedAt: null, id: challengeId },
  })

  if (result.count !== 1) {
    throw accountAccessError({
      code: "CONFLICT",
      internalMessage: "Authentication challenge was already consumed.",
      operation: "mobileAccountAccess.challenge.consume",
      publicMessage: "This code is invalid or no longer available.",
    })
  }
}

export async function completeMobilePasswordRecovery(
  input: {
    challengeId: string
    evidenceHash: string
    passwordHash: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const operation = "mobileAccountAccess.passwordRecovery.complete"
  const prisma = requirePrisma(operation, prismaOverride)

  await preflightAuthChallenge(prisma, {
    challengeId: input.challengeId,
    evidenceHash: input.evidenceHash,
    purpose: "password_recovery",
    tenantId: input.tenantId,
  })

  return prisma.$transaction(async (tx) => {
    const challenge = await getUsableChallenge(tx, {
      challengeId: input.challengeId,
      evidenceHash: input.evidenceHash,
      purpose: "password_recovery",
      tenantId: input.tenantId,
    })
    if (!challenge.userId) {
      throw accountAccessError({
        code: "UNEXPECTED",
        internalMessage: "Password recovery challenge lost its user.",
        operation,
      })
    }
    const user = await tx.user.findFirst({
      where: {
        deletedAt: null,
        id: challenge.userId,
        tenantId: input.tenantId,
      },
    })
    if (!user) {
      throw accountAccessError({
        code: "NOT_FOUND",
        internalMessage: "Password recovery user was not found.",
        operation,
        publicMessage: "This code is invalid or no longer available.",
      })
    }
    const membership = await tx.membership.findFirst({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      where: { tenantId: input.tenantId, userId: user.id },
    })
    if (!membership && !user.isPlatformOwner) {
      throw accountAccessError({
        code: "PRECONDITION_FAILED",
        internalMessage: "Recovered account has no active membership.",
        operation,
        publicMessage: "This account is not active for the cooperative.",
      })
    }

    await revokeAllMobileDeviceSessionsWithClient(tx, {
      actorUserId: user.id,
      reason: "password_reset",
      tenantId: input.tenantId,
      userId: user.id,
    })
    await tx.user.update({
      data: { passwordHash: input.passwordHash },
      where: { id: user.id },
    })
    await consumeChallenge(tx, challenge.id)
    await auditAuthEvent(tx, {
      action: "auth.password_recovery.completed",
      actorUserId: user.id,
      entityId: challenge.id,
      metadata: { membershipId: membership?.id ?? null },
      tenantId: input.tenantId,
    })

    return { membership, user }
  })
}

export async function enforceAuthRateLimits(
  input: {
    now?: Date
    operation: string
    rules: AuthRateLimitRule[]
    tenantId?: string | null
  },
  prismaOverride?: PrismaClient
) {
  const operation = `mobileAccountAccess.rateLimit.${input.operation}`
  const prisma = requirePrisma(operation, prismaOverride)
  const now = input.now ?? new Date()

  const exceededSignalTypes = await prisma.$transaction(async (tx) => {
    const exceeded: AuthRateLimitSignalType[] = []
    await tx.authRateLimitBucket.deleteMany({
      where: {
        expiresAt: { lt: now },
        tenantId: input.tenantId ?? null,
      },
    })
    for (const rule of input.rules) {
      if (!rule.signalHash || rule.limit < 1 || rule.windowMs < 1_000) {
        throw accountAccessError({
          code: "VALIDATION_FAILED",
          internalMessage: "Invalid authentication rate-limit rule.",
          operation,
        })
      }
      const windowStartedAt = floorWindow(now, rule.windowMs)
      const bucket = await tx.authRateLimitBucket.upsert({
        create: {
          attemptCount: 1,
          expiresAt: new Date(windowStartedAt.getTime() + rule.windowMs * 2),
          operation: input.operation,
          signalHash: rule.signalHash,
          signalType: rule.signalType,
          tenantId: input.tenantId ?? null,
          windowStartedAt,
        },
        update: { attemptCount: { increment: 1 } },
        where: {
          operation_signalType_signalHash_windowStartedAt: {
            operation: input.operation,
            signalHash: rule.signalHash,
            signalType: rule.signalType,
            windowStartedAt,
          },
        },
      })
      if (bucket.attemptCount > rule.limit) {
        exceeded.push(rule.signalType)
      }
    }
    return exceeded
  })

  if (exceededSignalTypes.length > 0) {
    throw accountAccessError({
      code: "RATE_LIMITED",
      internalMessage: `Rate limit exceeded for ${exceededSignalTypes.join(", ")}.`,
      operation,
      publicMessage:
        "Too many attempts. Wait a few minutes before trying again.",
    })
  }

  return { allowed: true as const }
}
