import { QueryInfrastructureError } from "../query-error"
import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"

type MobileSessionWriteClient = Prisma.TransactionClient

const lastUsedWriteIntervalMs = 5 * 60 * 1000

export type MobileDeviceSessionSummary = {
  appVersion: string
  buildVariant: string
  createdAt: Date
  current: boolean
  deviceLabel: string
  expiresAt: Date
  id: string
  lastUsedAt: Date
  platform: string
  revokedAt: Date | null
  revocationReason: string | null
}

export type MobileDeviceSessionOwnerSummary = {
  fullName: string
  id: string
}

function requirePrisma(operation: string, override?: PrismaClient) {
  const prisma = override ?? createPrismaClient()
  if (!prisma) {
    throw new QueryInfrastructureError(`${operation} is unavailable without database configuration.`)
  }
  return prisma
}

function normalizeRequired(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) {
    throw ExpectedQueryError.validation(`${label} is required.`)
  }
  return normalized
}

function toSummary(
  session: {
    appVersion: string
    buildVariant: string
    createdAt: Date
    deviceLabel: string
    expiresAt: Date
    id: string
    lastUsedAt: Date
    platform: string
    revokedAt: Date | null
    revocationReason: string | null
    tokenHash: string
  },
  currentTokenHash?: string | null
): MobileDeviceSessionSummary {
  return {
    appVersion: session.appVersion,
    buildVariant: session.buildVariant,
    createdAt: session.createdAt,
    current: Boolean(
      currentTokenHash && session.tokenHash === currentTokenHash
    ),
    deviceLabel: session.deviceLabel,
    expiresAt: session.expiresAt,
    id: session.id,
    lastUsedAt: session.lastUsedAt,
    platform: session.platform,
    revokedAt: session.revokedAt,
    revocationReason: session.revocationReason,
  }
}

async function writeSessionAudit(
  tx: MobileSessionWriteClient,
  input: {
    action: string
    actorUserId: string
    metadata: Prisma.InputJsonValue
    sessionId: string
    tenantId: string
  }
) {
  await tx.auditLog.create({
    data: {
      action: input.action,
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: input.sessionId,
      entityType: "MobileDeviceSession",
      metadata: input.metadata,
      occurredAt: new Date(),
      tenantId: input.tenantId,
    },
  })
}

export async function createMobileDeviceSession(
  input: {
    actorUserId: string
    appVersion: string
    buildVariant: string
    deviceIdHash: string
    deviceLabel: string
    expiresAt: Date
    membershipId?: string | null
    platform: string
    replacesTokenHash?: string | null
    tenantId: string
    tokenHash: string
  },
  prismaOverride?: PrismaClient
) {
  const operation = "Mobile device session creation"
  const prisma = requirePrisma(operation, prismaOverride)
  const appVersion = normalizeRequired(input.appVersion, "App version")
  const buildVariant = normalizeRequired(input.buildVariant, "Build variant")
  const deviceIdHash = normalizeRequired(input.deviceIdHash, "Device hash")
  const deviceLabel = normalizeRequired(input.deviceLabel, "Device label")
  const platform = normalizeRequired(input.platform, "Platform")
  const tokenHash = normalizeRequired(input.tokenHash, "Token hash")
  const now = new Date()
  if (input.expiresAt <= now) {
    throw ExpectedQueryError.validation("Session expiry must be in the future.")
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: {
        deletedAt: null,
        id: input.actorUserId,
        tenantId: input.tenantId,
      },
    })
    if (!user) {
      throw ExpectedQueryError.notFound("Session user was not found.")
    }
    if (input.membershipId) {
      const membership = await tx.membership.findFirst({
        where: {
          id: input.membershipId,
          tenantId: input.tenantId,
          userId: input.actorUserId,
        },
      })
      if (!membership) {
        throw ExpectedQueryError.validation(
          "Session membership is not available for this account."
        )
      }
    }

    const sessionsToReplace = input.replacesTokenHash
      ? await tx.mobileDeviceSession.findMany({
          select: { id: true },
          where: {
            OR: [
              { deviceIdHash },
              { tokenHash: input.replacesTokenHash },
            ],
            revokedAt: null,
            tenantId: input.tenantId,
            userId: input.actorUserId,
          },
        })
      : await tx.mobileDeviceSession.findMany({
          select: { id: true },
          where: {
            deviceIdHash,
            revokedAt: null,
            tenantId: input.tenantId,
            userId: input.actorUserId,
          },
        })

    if (input.replacesTokenHash) {
      const replacement = await tx.mobileDeviceSession.updateMany({
        data: {
          revocationReason: "replaced",
          revokedAt: now,
          revokedByUserId: input.actorUserId,
        },
        where: {
          revokedAt: null,
          tenantId: input.tenantId,
          tokenHash: input.replacesTokenHash,
          userId: input.actorUserId,
        },
      })
      if (replacement.count !== 1) {
        throw ExpectedQueryError.conflict(
          "This mobile session was already replaced or revoked."
        )
      }
    }

    await tx.mobileDeviceSession.updateMany({
      data: {
        revocationReason: "replaced",
        revokedAt: now,
        revokedByUserId: input.actorUserId,
      },
      where: {
        deviceIdHash,
        revokedAt: null,
        tenantId: input.tenantId,
        userId: input.actorUserId,
      },
    })

    if (sessionsToReplace.length) {
      await tx.mobilePushRegistration.deleteMany({
        where: {
          mobileDeviceSessionId: {
            in: sessionsToReplace.map((session) => session.id),
          },
        },
      })
    }

    const session = await tx.mobileDeviceSession.create({
      data: {
        appVersion,
        buildVariant,
        deviceIdHash,
        deviceLabel,
        expiresAt: input.expiresAt,
        membershipId: input.membershipId ?? null,
        platform,
        tenantId: input.tenantId,
        tokenHash,
        userId: input.actorUserId,
      },
    })
    await writeSessionAudit(tx, {
      action: "mobile.session.created",
      actorUserId: input.actorUserId,
      metadata: {
        appVersion,
        buildVariant,
        deviceLabel,
        expiresAt: input.expiresAt.toISOString(),
        membershipId: input.membershipId ?? null,
        platform,
      },
      sessionId: session.id,
      tenantId: input.tenantId,
    })
    for (const replaced of sessionsToReplace) {
      await writeSessionAudit(tx, {
        action: "mobile.session.replaced",
        actorUserId: input.actorUserId,
        metadata: { replacementSessionId: session.id },
        sessionId: replaced.id,
        tenantId: input.tenantId,
      })
    }
    return toSummary(session, tokenHash)
  })
}

export async function validateMobileDeviceSession(
  input: {
    deviceIdHash: string
    membershipId?: string | null
    tenantId?: string | null
    tokenHash: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = requirePrisma("Mobile device session validation", prismaOverride)
  const now = new Date()
  const session = await prisma.mobileDeviceSession.findUnique({
    include: {
      membership: {
        select: { id: true, role: true, tenantId: true, userId: true },
      },
      tenant: { select: { status: true } },
      user: {
        select: {
          deletedAt: true,
          memberProfile: { select: { status: true } },
        },
      },
    },
    where: { tokenHash: input.tokenHash },
  })
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    session.user.deletedAt ||
    session.tenant.status !== "active" ||
    session.userId !== input.userId ||
    session.deviceIdHash !== input.deviceIdHash ||
    (input.tenantId && session.tenantId !== input.tenantId) ||
    (input.membershipId &&
      (!session.membership ||
        session.membership.id !== input.membershipId ||
        session.membership.tenantId !== session.tenantId ||
        session.membership.userId !== session.userId)) ||
    (session.membership?.role === "member" &&
      (!session.user.memberProfile ||
        ["inactive", "suspended", "exited"].includes(
          session.user.memberProfile.status
        )))
  ) {
    return null
  }

  if (now.getTime() - session.lastUsedAt.getTime() >= lastUsedWriteIntervalMs) {
    await prisma.mobileDeviceSession.updateMany({
      data: { lastUsedAt: now },
      where: { id: session.id, revokedAt: null },
    })
  }
  return { id: session.id, tenantId: session.tenantId, userId: session.userId }
}

export async function listMobileDeviceSessions(
  input: {
    currentTokenHash: string
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = requirePrisma("Mobile device session listing", prismaOverride)
  const sessions = await prisma.mobileDeviceSession.findMany({
    orderBy: [{ revokedAt: "asc" }, { lastUsedAt: "desc" }],
    take: 25,
    where: { tenantId: input.tenantId, userId: input.userId },
  })
  return sessions.map((session) => toSummary(session, input.currentTokenHash))
}

export async function listMobileDeviceSessionsForAdmin(
  input: {
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = requirePrisma(
    "Administrative mobile device session listing",
    prismaOverride
  )
  const owner = await prisma.user.findFirst({
    select: { fullName: true, id: true },
    where: {
      deletedAt: null,
      id: input.userId,
      tenantId: input.tenantId,
    },
  })
  if (!owner) {
    throw ExpectedQueryError.notFound("Workspace user was not found.")
  }
  const sessions = await prisma.mobileDeviceSession.findMany({
    orderBy: [{ revokedAt: "asc" }, { lastUsedAt: "desc" }],
    take: 25,
    where: { tenantId: input.tenantId, userId: input.userId },
  })
  return {
    owner: owner satisfies MobileDeviceSessionOwnerSummary,
    sessions: sessions.map((session) => toSummary(session)),
  }
}

export async function countMobileDeviceSessionRevocations(
  input: {
    createdAtOrAfter: Date
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  if (!Number.isFinite(input.createdAtOrAfter.getTime())) {
    throw ExpectedQueryError.validation("A valid session start time is required.")
  }
  const prisma = requirePrisma("Mobile session revocation evidence", prismaOverride)
  const { _count } = await prisma.mobileDeviceSession.aggregate({
    _count: { _all: true, revokedAt: true },
    where: {
      createdAt: { gte: input.createdAtOrAfter },
      tenantId: normalizeRequired(input.tenantId, "Tenant"),
      userId: normalizeRequired(input.userId, "User"),
    },
  })
  return { sessionCount: _count._all, revokedSessionCount: _count.revokedAt }
}

export async function revokeMobileDeviceSession(
  input: {
    actorUserId: string
    reason: "compromised" | "signed_out" | "user_revoked"
    sessionId: string
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = requirePrisma("Mobile device session revocation", prismaOverride)
  return prisma.$transaction(async (tx) => {
    const session = await tx.mobileDeviceSession.findFirst({
      where: {
        id: input.sessionId,
        tenantId: input.tenantId,
        userId: input.userId,
      },
    })
    if (!session) {
      throw ExpectedQueryError.notFound("Device session was not found.")
    }
    if (!session.revokedAt) {
      await tx.mobilePushRegistration.deleteMany({
        where: { mobileDeviceSessionId: session.id },
      })
      await tx.mobileDeviceSession.update({
        data: {
          revocationReason: input.reason,
          revokedAt: new Date(),
          revokedByUserId: input.actorUserId,
        },
        where: { id: session.id },
      })
      await writeSessionAudit(tx, {
        action: "mobile.session.revoked",
        actorUserId: input.actorUserId,
        metadata: { reason: input.reason, userId: input.userId },
        sessionId: session.id,
        tenantId: input.tenantId,
      })
    }
    return { id: session.id, revoked: true as const }
  })
}

export async function revokeAllMobileDeviceSessions(
  input: {
    actorUserId: string
    reason: "password_reset" | "security_reset" | "sign_out_all"
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = requirePrisma("Mobile device session bulk revocation", prismaOverride)
  return prisma.$transaction((tx) =>
    revokeAllMobileDeviceSessionsWithClient(tx, input)
  )
}

export async function revokeAllMobileDeviceSessionsWithClient(
  tx: MobileSessionWriteClient,
  input: {
    actorUserId: string
    reason: "password_reset" | "security_reset" | "sign_out_all"
    tenantId: string
    userId: string
  }
) {
  const now = new Date()
  await tx.mobilePushRegistration.deleteMany({
    where: {
      tenantId: input.tenantId,
      userId: input.userId,
    },
  })
  const result = await tx.mobileDeviceSession.updateMany({
    data: {
      revocationReason: input.reason,
      revokedAt: now,
      revokedByUserId: input.actorUserId,
    },
    where: {
      revokedAt: null,
      tenantId: input.tenantId,
      userId: input.userId,
    },
  })
  await writeSessionAudit(tx, {
    action: "mobile.session.revoked_all",
    actorUserId: input.actorUserId,
    metadata: { count: result.count, reason: input.reason },
    sessionId: input.userId,
    tenantId: input.tenantId,
  })
  return { count: result.count }
}
