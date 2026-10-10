import { createHash } from "node:crypto"
import type { PrismaClient } from "../../generated/prisma/client"
import { AppError } from "@halaalvest/errors"
import { createPrismaClient } from "../prisma"
import { ensureTenantSubscription } from "./subscriptions"

export type VerifiedStoreEntitlement = {
  accountBinding: string
  productId: string
  planCode: "starter" | "standard" | "growth"
  providerName: "apple_app_store" | "google_play"
  providerSubscriptionId: string
  previousProviderSubscriptionId?: string
  periodStartsAt: Date
  periodEndsAt: Date
  graceEndsAt: Date | null
  status: "active" | "grace" | "suspended" | "cancelled"
  cancelAtPeriodEnd: boolean
  verifiedAt: Date
  environment: "production" | "sandbox"
}
function unavailable() {
  return new AppError({
    code: "PRECONDITION_FAILED",
    publicMessage:
      "This store purchase cannot be applied to this cooperative. Contact support with your store receipt.",
  })
}
export async function getStoreAccountBinding(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw unavailable()
  const subscription = await ensureTenantSubscription(tenantId, prisma)
  if (!subscription) throw unavailable()
  return subscription.id
}

export async function isActiveQaStoreTenant(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return false
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      dataClassification: true,
      qaSourceDomain: true,
      qaPurgeStartedAt: true,
    },
  })
  return (
    tenant?.dataClassification === "qa" &&
    Boolean(tenant.qaSourceDomain) &&
    !tenant.qaPurgeStartedAt
  )
}

/** Only call after authoritative provider verification, never from client receipt fields. */
export async function applyVerifiedStoreEntitlement(
  input: {
    evidence: VerifiedStoreEntitlement
    expectedTenantId?: string
    actorUserId?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw unavailable()
  const e = input.evidence
  const eventPayload = {
    accountBinding: e.accountBinding,
    productId: e.productId,
    planCode: e.planCode,
    providerSubscriptionId: e.providerSubscriptionId,
    ...(e.previousProviderSubscriptionId
      ? { previousProviderSubscriptionId: e.previousProviderSubscriptionId }
      : {}),
    periodStartsAt: e.periodStartsAt.toISOString(),
    periodEndsAt: e.periodEndsAt.toISOString(),
    graceEndsAt: e.graceEndsAt?.toISOString() ?? null,
    status: e.status,
    cancelAtPeriodEnd: e.cancelAtPeriodEnd,
    environment: e.environment,
  }
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(eventPayload))
    .digest("hex")
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const current = await tx.tenantSubscription.findUnique({
            where: { id: e.accountBinding },
          })
          if (
            !current ||
            (input.expectedTenantId &&
              input.expectedTenantId !== current.tenantId)
          )
            throw unavailable()
          const tenant = await tx.tenant.findUnique({
            where: { id: current.tenantId },
            select: {
              qaSourceDomain: true,
              qaPurgeStartedAt: true,
              dataClassification: true,
            },
          })
          if (
            !tenant ||
            tenant.qaPurgeStartedAt ||
            (e.environment === "sandbox" &&
              (!tenant.qaSourceDomain || tenant.dataClassification !== "qa"))
          )
            throw unavailable()
          if (input.actorUserId) {
            const actor = await tx.user.findFirst({
              where: {
                id: input.actorUserId,
                deletedAt: null,
                memberships: {
                  some: {
                    tenantId: current.tenantId,
                    role: { in: ["super_admin", "tenant_admin"] },
                  },
                },
              },
              select: { id: true },
            })
            if (!actor) throw unavailable()
          }
          if (current.providerName && current.providerName !== e.providerName)
            throw unavailable()
          if (
            current.providerSubscriptionId &&
            current.providerSubscriptionId !== e.providerSubscriptionId &&
            current.providerSubscriptionId !== e.previousProviderSubscriptionId
          ) {
            // Google expires the old token after a deferred replacement. Its late notification
            // is a no-op only when an applied provider event proves that exact token was replaced.
            if (e.providerName === "google_play" && e.status === "suspended") {
              const replacement = await tx.subscriptionProviderEvent.findFirst({
                where: {
                  tenantId: current.tenantId,
                  providerName: "google_play",
                  eventType: "subscription.verified",
                  status: "applied",
                  payload: {
                    path: ["previousProviderSubscriptionId"],
                    equals: e.providerSubscriptionId,
                  },
                },
                select: { id: true },
              })
              if (replacement)
                return {
                  applied: false,
                  tenantId: current.tenantId,
                  subscriptionId: current.id,
                }
            }
            // A new chain may replace an expired chain, but an active old purchase may never replace a newer one.
            if (
              !current.currentPeriodEndsAt ||
              current.currentPeriodEndsAt > e.periodStartsAt ||
              e.status !== "active"
            )
              throw unavailable()
          }
          const owner = await tx.tenantSubscription.findUnique({
            where: {
              providerName_providerSubscriptionId: {
                providerName: e.providerName,
                providerSubscriptionId: e.providerSubscriptionId,
              },
            },
            select: { id: true },
          })
          if (owner && owner.id !== current.id) throw unavailable()
          const plan = await tx.subscriptionPlan.findUnique({
            where: { code: e.planCode },
          })
          if (!plan?.isActive) throw unavailable()
          const newer =
            current.lastProviderEventAt &&
            current.lastProviderEventAt > e.verifiedAt
          if (newer)
            return {
              applied: false,
              tenantId: current.tenantId,
              subscriptionId: current.id,
            }
          const previousEvent = await tx.subscriptionProviderEvent.findUnique({
            where: {
              providerName_providerEventId: {
                providerName: e.providerName,
                providerEventId: payloadHash,
              },
            },
          })
          if (previousEvent && previousEvent.tenantId !== current.tenantId)
            throw unavailable()
          if (
            current.lastProviderEventAt?.getTime() === e.verifiedAt.getTime()
          ) {
            // Distinct provider states verified in one millisecond have no safe order.
            // Retry against current provider state with a fresh verification time.
            if (!previousEvent)
              throw new AppError({
                code: "CONFLICT",
                publicMessage:
                  "The store result could not be reconciled yet. Restore purchases to retry.",
              })
            return {
              applied: false,
              tenantId: current.tenantId,
              subscriptionId: current.id,
            }
          }
          // A repeated state still refreshes the authoritative verification timestamp.
          await tx.tenantSubscription.update({
            where: { id: current.id },
            data: {
              planId: plan.id,
              source: "billing_provider",
              status: e.status,
              providerName: e.providerName,
              providerSubscriptionId: e.providerSubscriptionId,
              // SubscriptionsV2.startTime is the original Google grant time, not the
              // current renewal period start. Leave that unavailable rather than
              // presenting the first purchase date as a later billing period.
              currentPeriodStartsAt:
                e.providerName === "google_play" ? null : e.periodStartsAt,
              currentPeriodEndsAt: e.periodEndsAt,
              graceEndsAt: e.graceEndsAt,
              cancelAtPeriodEnd: e.cancelAtPeriodEnd,
              cancelledAt: e.cancelAtPeriodEnd
                ? (current.cancelledAt ?? e.verifiedAt)
                : null,
              endedAt: e.status === "suspended" ? e.verifiedAt : null,
              trialStartsAt: null,
              trialEndsAt: null,
              activeMemberLimitOverride: null,
              lastProviderEventAt: e.verifiedAt,
              sourceState: {
                nativeStore: e.providerName,
                productId: e.productId,
                environment: e.environment,
              },
            },
          })
          if (!previousEvent) {
            await tx.subscriptionProviderEvent.create({
              data: {
                tenantId: current.tenantId,
                providerName: e.providerName,
                providerEventId: payloadHash,
                eventType: "subscription.verified",
                status: "applied",
                payloadHash,
                payload: eventPayload,
                occurredAt: e.verifiedAt,
                processedAt: new Date(),
                attempts: 1,
              },
            })
            await tx.auditLog.create({
              data: {
                tenantId: current.tenantId,
                actorType: input.actorUserId ? "user" : "system",
                actorUserId: input.actorUserId ?? null,
                action: "subscription.store_verified",
                entityType: "tenant_subscription",
                entityId: current.id,
                metadata: {
                  provider: e.providerName,
                  planCode: e.planCode,
                  status: e.status,
                  environment: e.environment,
                },
                occurredAt: e.verifiedAt,
              },
            })
          }
          return {
            applied: true,
            tenantId: current.tenantId,
            subscriptionId: current.id,
          }
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
