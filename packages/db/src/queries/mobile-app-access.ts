import { createHash } from "node:crypto"
import { AppError } from "@halaalvest/errors"
import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"

export type VerifiedMobileAppAccess = {
  userBinding: string
  providerName: "apple_app_store" | "google_play"
  providerSubscriptionId: string
  previousProviderSubscriptionId?: string
  productId: string
  duration: "six_months" | "annual"
  status: "active" | "grace" | "suspended"
  periodStartsAt: Date | null
  periodEndsAt: Date
  graceEndsAt: Date | null
  cancelAtPeriodEnd: boolean
  verifiedAt: Date
  environment: "production" | "sandbox"
}

function unavailable() {
  return new AppError({
    code: "PRECONDITION_FAILED",
    publicMessage:
      "This app purchase could not be matched to your account. Use Restore purchases or contact support.",
  })
}

function evidencePayload(e: VerifiedMobileAppAccess) {
  return {
    userBinding: e.userBinding.toLowerCase(),
    providerName: e.providerName,
    providerSubscriptionId: e.providerSubscriptionId,
    previousProviderSubscriptionId: e.previousProviderSubscriptionId ?? null,
    productId: e.productId,
    duration: e.duration,
    status: e.status,
    periodStartsAt: e.periodStartsAt?.toISOString() ?? null,
    periodEndsAt: e.periodEndsAt.toISOString(),
    graceEndsAt: e.graceEndsAt?.toISOString() ?? null,
    cancelAtPeriodEnd: e.cancelAtPeriodEnd,
    environment: e.environment,
  }
}

export function mobileAppAccessAllowed(
  purchase: {
    status: string
    periodEndsAt: Date
    graceEndsAt: Date | null
  },
  now = new Date()
) {
  if (purchase.status === "active") return purchase.periodEndsAt > now
  if (purchase.status === "grace")
    return Boolean(purchase.graceEndsAt && purchase.graceEndsAt > now)
  return false
}

export async function getMobileAppAccessSnapshot(
  input: {
    userId: string
    tenantId?: string
    environment: "production" | "sandbox"
    now?: Date
  },
  override?: PrismaClient
) {
  const db = override ?? createPrismaClient()
  if (!db) throw unavailable()
  const now = input.now ?? new Date()
  const purchases = await db.mobileAppAccessPurchase.findMany({
    where: {
      userId: input.userId,
      environment: input.environment,
      user: { deletedAt: null },
    },
    select: {
      id: true,
      duration: true,
      status: true,
      periodEndsAt: true,
      graceEndsAt: true,
      cancelAtPeriodEnd: true,
      providerName: true,
    },
    orderBy: { periodEndsAt: "desc" },
  })
  const current = purchases.find((purchase) =>
    mobileAppAccessAllowed(purchase, now)
  )
  const reviewGrant =
    !current && input.tenantId
      ? await db.mobileAppReviewGrant.findFirst({
          where: {
            userId: input.userId,
            tenantId: input.tenantId,
            environment: input.environment,
            revokedAt: null,
            expiresAt: { gt: now },
            user: { deletedAt: null },
            tenant: {
              dataClassification: "qa",
              status: "active",
              qaSourceDomain: { not: null },
              qaPurgeStartedAt: null,
            },
          },
          select: { expiresAt: true },
        })
      : null
  return {
    userBinding: input.userId,
    accessAllowed: Boolean(current || reviewGrant),
    status: current?.status ?? (reviewGrant ? "review_grant" : "unsubscribed"),
    duration: current?.duration ?? null,
    periodEndsAt: current?.periodEndsAt ?? null,
    accessEndsAt:
      reviewGrant?.expiresAt ??
      (current?.status === "grace"
        ? (current.graceEndsAt ?? null)
        : (current?.periodEndsAt ?? null)),
    cancelAtPeriodEnd: current?.cancelAtPeriodEnd ?? false,
    providerName: current?.providerName ?? null,
  }
}

/** Apply only server-verified current provider state. Never trust mobile receipt fields. */
export async function applyVerifiedMobileAppAccess(
  input: {
    evidence: VerifiedMobileAppAccess
    expectedUserId?: string
    expectedTenantId?: string
    actorUserId?: string
  },
  override?: PrismaClient
) {
  const db = override ?? createPrismaClient()
  if (!db) throw unavailable()
  const e = input.evidence
  const userId = e.userBinding.toLowerCase()
  if (input.expectedUserId && input.expectedUserId.toLowerCase() !== userId)
    throw unavailable()
  const payload = evidencePayload(e)
  const evidenceHash = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")

  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              tenantId: true,
              deletedAt: true,
              tenant: {
                select: {
                  dataClassification: true,
                  qaSourceDomain: true,
                  qaPurgeStartedAt: true,
                },
              },
            },
          })
          if (
            !user ||
            user.tenant.qaPurgeStartedAt ||
            (e.environment === "sandbox" &&
              (user.tenant.dataClassification !== "qa" ||
                !user.tenant.qaSourceDomain))
          )
            throw unavailable()
          if (input.expectedTenantId) {
            const membership = await tx.membership.findFirst({
              where: { userId, tenantId: input.expectedTenantId },
              select: { id: true },
            })
            if (!membership) throw unavailable()
          }
          if (input.actorUserId && input.actorUserId !== userId)
            throw unavailable()
          const current = await tx.mobileAppAccessPurchase.findUnique({
            where: {
              providerName_providerSubscriptionId: {
                providerName: e.providerName,
                providerSubscriptionId: e.providerSubscriptionId,
              },
            },
          })
          if (
            current &&
            (current.userId !== userId || current.environment !== e.environment)
          )
            throw unavailable()
          const previous = e.previousProviderSubscriptionId
            ? await tx.mobileAppAccessPurchase.findUnique({
                where: {
                  providerName_providerSubscriptionId: {
                    providerName: e.providerName,
                    providerSubscriptionId: e.previousProviderSubscriptionId,
                  },
                },
                select: { userId: true, environment: true },
              })
            : null
          if (
            previous &&
            (previous.userId !== userId ||
              previous.environment !== e.environment)
          )
            throw unavailable()
          // Revocation ends login access, not the store's billing relationship.
          // Only a verified system notice for a known chain may reconcile it.
          if (
            user.deletedAt &&
            (input.actorUserId ||
              input.expectedUserId ||
              input.expectedTenantId ||
              (!current && !previous))
          )
            throw unavailable()
          if (current && current.lastVerifiedAt > e.verifiedAt)
            return { applied: false, userId, purchaseId: current.id }
          if (
            current &&
            current.lastVerifiedAt.getTime() === e.verifiedAt.getTime()
          ) {
            if (current.lastEvidenceHash !== evidenceHash)
              throw new AppError({
                code: "CONFLICT",
                publicMessage:
                  "The app purchase needs another store check. Use Restore purchases to retry.",
              })
            return { applied: true, userId, purchaseId: current.id }
          }
          const data = {
            previousProviderSubscriptionId:
              e.previousProviderSubscriptionId ?? null,
            productId: e.productId,
            duration: e.duration,
            status: e.status,
            periodStartsAt: e.periodStartsAt,
            periodEndsAt: e.periodEndsAt,
            graceEndsAt: e.graceEndsAt,
            cancelAtPeriodEnd: e.cancelAtPeriodEnd,
            lastVerifiedAt: e.verifiedAt,
            lastEvidenceHash: evidenceHash,
          }
          const purchase = current
            ? await tx.mobileAppAccessPurchase.update({
                where: { id: current.id },
                data,
              })
            : await tx.mobileAppAccessPurchase.create({
                data: {
                  tenantId: user.tenantId,
                  userId,
                  providerName: e.providerName,
                  providerSubscriptionId: e.providerSubscriptionId,
                  environment: e.environment,
                  ...data,
                },
              })
          const priorEvidence = current
            ? await tx.mobileAppAccessProviderEvent.findUnique({
                where: {
                  purchaseId_evidenceHash: {
                    purchaseId: purchase.id,
                    evidenceHash,
                  },
                },
                select: { id: true },
              })
            : null
          if (!priorEvidence) {
            await tx.mobileAppAccessProviderEvent.create({
              data: {
                purchaseId: purchase.id,
                evidenceHash,
                payload,
                verifiedAt: e.verifiedAt,
              },
            })
            await tx.auditLog.create({
              data: {
                tenantId: user.tenantId,
                actorType: input.actorUserId ? "user" : "system",
                actorUserId: input.actorUserId ?? null,
                action: "mobile_app_access.store_verified",
                entityType: "mobile_app_access_purchase",
                entityId: purchase.id,
                metadata: {
                  provider: e.providerName,
                  duration: e.duration,
                  status: e.status,
                  environment: e.environment,
                  ...(user.deletedAt
                    ? { reconciledAfterAccessRevocation: true }
                    : {}),
                },
                occurredAt: e.verifiedAt,
              },
            })
          }
          return { applied: true, userId, purchaseId: purchase.id }
        },
        { isolationLevel: "Serializable" }
      )
    } catch (error) {
      if (
        attempt < 2 &&
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        ["P2034", "P2002"].includes(String(error.code))
      )
        continue
      throw error
    }
  }
}
