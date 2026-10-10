import { AppError } from "@halaalvest/errors"
import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"

type StoreEnvironment = "production" | "sandbox"

function unavailable() {
  return new AppError({
    code: "PRECONDITION_FAILED",
    publicMessage: "Review access could not be changed. Refresh and try again.",
  })
}

async function requireReviewOperator(
  db: Prisma.TransactionClient,
  actorUserId: string
) {
  const actor = await db.user.findFirst({
    where: { id: actorUserId, isPlatformOwner: true, deletedAt: null },
    select: { id: true },
  })
  if (!actor) throw unavailable()
}

export async function issueMobileAppReviewGrant(
  input: {
    actorUserId: string
    userId: string
    environment: StoreEnvironment
    expiresAt: Date
    reason: string
    now?: Date
  },
  override?: PrismaClient
) {
  const db = override ?? createPrismaClient()
  if (!db || input.actorUserId === input.userId) throw unavailable()
  const now = input.now ?? new Date()
  const reason = input.reason.trim()
  if (
    reason.length < 20 ||
    reason.length > 500 ||
    !Number.isFinite(input.expiresAt.getTime()) ||
    input.expiresAt.getTime() <= now.getTime() + 60 * 60 * 1000 ||
    input.expiresAt.getTime() > now.getTime() + 30 * 24 * 60 * 60 * 1000
  )
    throw unavailable()
  return db.$transaction(
    async (tx) => {
      await requireReviewOperator(tx, input.actorUserId)
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          tenantId: true,
          deletedAt: true,
          isPlatformOwner: true,
          tenant: {
            select: {
              dataClassification: true,
              status: true,
              qaSourceDomain: true,
              qaPurgeStartedAt: true,
            },
          },
          memberships: { select: { tenantId: true } },
        },
      })
      if (
        !user ||
        user.deletedAt ||
        user.isPlatformOwner ||
        user.tenant.dataClassification !== "qa" ||
        user.tenant.status !== "active" ||
        !user.tenant.qaSourceDomain ||
        user.tenant.qaPurgeStartedAt ||
        !user.memberships.length ||
        user.memberships.some(
          (membership) => membership.tenantId !== user.tenantId
        )
      )
        throw unavailable()
      const grant = await tx.mobileAppReviewGrant.upsert({
        where: { userId: user.id },
        create: {
          tenantId: user.tenantId,
          userId: user.id,
          environment: input.environment,
          expiresAt: input.expiresAt,
          reason,
        },
        update: {
          tenantId: user.tenantId,
          environment: input.environment,
          expiresAt: input.expiresAt,
          reason,
          revokedAt: null,
        },
        select: { id: true, expiresAt: true },
      })
      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          actorType: "user",
          actorUserId: input.actorUserId,
          action: "mobile_app_access.review_grant_issued",
          entityType: "mobile_app_review_grant",
          entityId: grant.id,
          metadata: {
            environment: input.environment,
            expiresAt: input.expiresAt.toISOString(),
            reason,
          },
          occurredAt: now,
        },
      })
      return { grantId: grant.id, expiresAt: grant.expiresAt }
    },
    { isolationLevel: "Serializable" }
  )
}

export async function revokeMobileAppReviewGrant(
  input: { actorUserId: string; userId: string; now?: Date },
  override?: PrismaClient
) {
  const db = override ?? createPrismaClient()
  if (!db) throw unavailable()
  return db.$transaction(
    async (tx) => {
      await requireReviewOperator(tx, input.actorUserId)
      const grant = await tx.mobileAppReviewGrant.findUnique({
        where: { userId: input.userId },
        select: { id: true, tenantId: true, revokedAt: true },
      })
      if (!grant) throw unavailable()
      if (grant.revokedAt) return { revoked: false }
      const now = input.now ?? new Date()
      await tx.mobileAppReviewGrant.update({
        where: { id: grant.id },
        data: { revokedAt: now },
      })
      await tx.auditLog.create({
        data: {
          tenantId: grant.tenantId,
          actorType: "user",
          actorUserId: input.actorUserId,
          action: "mobile_app_access.review_grant_revoked",
          entityType: "mobile_app_review_grant",
          entityId: grant.id,
          occurredAt: now,
        },
      })
      return { revoked: true }
    },
    { isolationLevel: "Serializable" }
  )
}
