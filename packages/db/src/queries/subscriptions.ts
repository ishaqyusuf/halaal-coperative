import { QueryInfrastructureError } from "../query-error"
import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import {
  createFailSafeSubscriptionSnapshot,
  resolveEffectiveSubscriptionStatus,
  resolveSubscriptionSnapshot,
  SUBSCRIPTION_PLAN_CODES,
  SUBSCRIPTION_PLAN_DEFINITIONS,
  type SubscriptionPlanCode,
  type SubscriptionSource,
  type SubscriptionStatus,
} from "@halaalvest/domain/subscriptions"
import { AppError } from "@halaalvest/errors"
import { createPrismaClient } from "../prisma"

const DEFAULT_FREE_BETA_DAYS = 90
const DEFAULT_GRACE_DAYS = 14

type SubscriptionWithPlanAndAddons = Prisma.TenantSubscriptionGetPayload<{
  include: { addons: true; plan: true }
}>
type SubscriptionDbClient = PrismaClient | Prisma.TransactionClient

export async function ensureSubscriptionPlans(
  prismaOverride?: SubscriptionDbClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return []

  const plans = []
  for (const code of SUBSCRIPTION_PLAN_CODES) {
    const definition = SUBSCRIPTION_PLAN_DEFINITIONS[code]
    const data = {
      activeMemberLimit: definition.activeMemberLimit,
      addonDefinitions:
        definition.addonDefinitions as unknown as Prisma.InputJsonValue,
      availableAddonCodes:
        definition.availableAddonCodes as Prisma.InputJsonValue,
      code,
      currencyCode: definition.monthlyPrice.currencyCode,
      description: definition.description,
      displayName: definition.displayName,
      entitlementDefinition:
        definition.entitlements as unknown as Prisma.InputJsonValue,
      isActive: true,
      isPublic: definition.isPublic,
      monthlyPriceMax: definition.monthlyPrice.maximum,
      monthlyPriceMin: definition.monthlyPrice.minimum,
      passThroughCostDefinitions:
        definition.passThroughCostDefinitions as unknown as Prisma.InputJsonValue,
      setupFeeMax: definition.setupFee.maximum,
      setupFeeMin: definition.setupFee.minimum,
      sortOrder: definition.sortOrder,
    }

    plans.push(
      await prisma.subscriptionPlan.upsert({
        create: data,
        update: data,
        where: { code },
      })
    )
  }
  return plans
}

export async function ensureTenantSubscription(
  tenantId: string,
  prismaOverride?: SubscriptionDbClient,
  now = new Date()
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return null

  const existing = await prisma.tenantSubscription.findUnique({
    include: { addons: true, plan: true },
    where: { tenantId },
  })
  if (existing) return existing

  await ensureSubscriptionPlans(prisma)
  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUnique({
      select: { id: true },
      where: { id: tenantId },
    }),
    prisma.subscriptionPlan.findUnique({ where: { code: "free_beta" } }),
  ])
  if (!tenant || !plan) return null

  // Existing cooperatives must receive the full rollout beta window. Anchoring
  // this to tenant.createdAt would instantly expire any tenant older than the
  // beta duration on the first subscription-aware request.
  const trialStartsAt = now
  const trialEndsAt = addDays(trialStartsAt, DEFAULT_FREE_BETA_DAYS)
  const graceEndsAt = addDays(trialEndsAt, DEFAULT_GRACE_DAYS)

  try {
    return await withSubscriptionTransaction(prisma, async (transaction) => {
      const concurrent = await transaction.tenantSubscription.findUnique({
        include: { addons: true, plan: true },
        where: { tenantId },
      })
      if (concurrent) return concurrent

      const subscription = await transaction.tenantSubscription.create({
        data: {
          graceEndsAt,
          planId: plan.id,
          source: "free_beta",
          sourceState: {
            initializedBy: "subscription_foundation",
            policy: "default_90_day_beta_plus_14_day_grace",
          },
          status: "free_beta",
          tenantId,
          trialEndsAt,
          trialStartsAt,
        },
        include: { addons: true, plan: true },
      })
      await transaction.auditLog.create({
        data: {
          action: "subscription.initialized",
          actorType: "system",
          entityId: subscription.id,
          entityType: "tenant_subscription",
          metadata: {
            planCode: "free_beta",
            policy: "default_90_day_beta_plus_14_day_grace",
            status: "free_beta",
          },
          occurredAt: new Date(),
          tenantId,
        },
      })
      return subscription
    })
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
    return prisma.tenantSubscription.findUnique({
      include: { addons: true, plan: true },
      where: { tenantId },
    })
  }
}

export async function getTenantSubscriptionSnapshot(
  input: { now?: Date; tenantId: string },
  prismaOverride?: SubscriptionDbClient
) {
  const now = input.now ?? new Date()
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return {
      ...createFailSafeSubscriptionSnapshot({ activeMemberCount: 0, now }),
      subscriptionId: null,
      tenantId: input.tenantId,
      updatedAt: now.toISOString(),
    }
  }

  let activeMemberCount = 0
  let usageAvailable = false
  try {
    // Keep these sequential so callers can safely reuse this policy inside a
    // Prisma interactive transaction without parallel-query adapter warnings.
    const ensuredSubscription = await ensureTenantSubscription(
      input.tenantId,
      prisma,
      now
    )
    const subscription = ensuredSubscription
      ? await reconcileTenantSubscriptionLifecycle(
          ensuredSubscription,
          now,
          prisma
        )
      : null
    activeMemberCount = await prisma.member.count({
      where: { status: "active", tenantId: input.tenantId },
    })
    usageAvailable = true
    const invoices = await prisma.subscriptionInvoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      where: { tenantId: input.tenantId },
    })
    if (!subscription) {
      return {
        ...createFailSafeSubscriptionSnapshot({ activeMemberCount, now }),
        subscriptionId: null,
        tenantId: input.tenantId,
        updatedAt: now.toISOString(),
      }
    }

    const activeAddons = subscription.addons.filter(
      (addon) =>
        addon.status === "active" &&
        addon.startsAt <= now &&
        (!addon.endsAt || addon.endsAt > now)
    )
    const snapshot = resolveSubscriptionSnapshot({
      activeAddonCodes: activeAddons.map((addon) => addon.code),
      activeMemberCount,
      activeMemberLimitOverride: subscription.activeMemberLimitOverride,
      billingInfrastructureAvailable: true,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEndsAt: subscription.currentPeriodEndsAt,
      currentPeriodStartsAt: subscription.currentPeriodStartsAt,
      graceEndsAt: subscription.graceEndsAt,
      now,
      planCode: subscription.plan.code,
      source: subscription.source,
      sourceState: toRecord(subscription.sourceState),
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      trialStartsAt: subscription.trialStartsAt,
    })

    return {
      ...snapshot,
      addons: activeAddons.map((addon) => ({
        code: addon.code,
        displayName: addon.displayName,
        endsAt: addon.endsAt?.toISOString() ?? null,
        startsAt: addon.startsAt.toISOString(),
        status: addon.status,
      })),
      subscriptionId: subscription.id,
      tenantId: input.tenantId,
      updatedAt: subscription.updatedAt.toISOString(),
      invoices: invoices.map((invoice) => ({
        amountPaid: Number(invoice.amountPaid),
        currencyCode: invoice.currencyCode,
        dueAt: invoice.dueAt?.toISOString() ?? null,
        hostedInvoiceUrl: invoice.hostedInvoiceUrl,
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        status: invoice.status,
        totalAmount: Number(invoice.totalAmount),
      })),
    }
  } catch {
    return {
      ...createFailSafeSubscriptionSnapshot({
        activeMemberCount,
        now,
        usageAvailable,
      }),
      subscriptionId: null,
      tenantId: input.tenantId,
      updatedAt: now.toISOString(),
    }
  }
}

export async function assertTenantCanActivateMember(
  tenantId: string,
  prismaOverride?: SubscriptionDbClient
) {
  const snapshot = await getTenantSubscriptionSnapshot(
    { tenantId },
    prismaOverride
  )
  if (!snapshot.enforcement.canActivateMember) {
    throw new SubscriptionEntitlementError(
      snapshot.enforcement.reason ?? "active_member_capacity_reached",
      "This cooperative has reached its active-member plan capacity."
    )
  }
  return snapshot
}

export async function assertTenantMemberLoginEntitled(
  tenantId: string,
  prismaOverride?: SubscriptionDbClient
) {
  const snapshot = await getTenantSubscriptionSnapshot(
    { tenantId },
    prismaOverride
  )
  if (!snapshot.enforcement.memberLoginEnabled) {
    throw new SubscriptionEntitlementError(
      snapshot.enforcement.reason ?? "member_login_not_entitled",
      "Member login is not enabled for this cooperative plan."
    )
  }
  return snapshot
}

export class SubscriptionEntitlementError extends AppError {
  constructor(
    readonly entitlementCode: string,
    message: string
  ) {
    super({
      code: "PERMISSION_DENIED",
      internalMessage: `${entitlementCode}: ${message}`,
      operation: "subscription.entitlement",
      publicMessage: message,
    })
    this.name = "SubscriptionEntitlementError"
  }
}

export async function transitionTenantSubscription(
  input: {
    activeMemberLimitOverride?: number | null
    actorUserId?: string | null
    currentPeriodEndsAt?: Date | null
    currentPeriodStartsAt?: Date | null
    graceEndsAt?: Date | null
    planCode: SubscriptionPlanCode
    reason: string
    source: SubscriptionSource
    sourceState?: Record<string, unknown>
    status: SubscriptionStatus
    tenantId: string
    trialEndsAt?: Date | null
    trialStartsAt?: Date | null
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await ensureSubscriptionPlans(prisma)

  return prisma.$transaction(async (transaction) => {
    const plan = await transaction.subscriptionPlan.findUnique({
      where: { code: input.planCode },
    })
    if (!plan)
      throw new QueryInfrastructureError(`Subscription plan ${input.planCode} was not found.`)

    const previous = await transaction.tenantSubscription.findUnique({
      where: { tenantId: input.tenantId },
    })
    const subscription = await transaction.tenantSubscription.upsert({
      create: {
        activeMemberLimitOverride: input.activeMemberLimitOverride,
        currentPeriodEndsAt: input.currentPeriodEndsAt,
        currentPeriodStartsAt: input.currentPeriodStartsAt,
        graceEndsAt: input.graceEndsAt,
        planId: plan.id,
        source: input.source,
        sourceState: input.sourceState as Prisma.InputJsonValue | undefined,
        status: input.status,
        tenantId: input.tenantId,
        trialEndsAt: input.trialEndsAt,
        trialStartsAt: input.trialStartsAt,
      },
      update: {
        activeMemberLimitOverride: input.activeMemberLimitOverride,
        currentPeriodEndsAt: input.currentPeriodEndsAt,
        currentPeriodStartsAt: input.currentPeriodStartsAt,
        graceEndsAt: input.graceEndsAt,
        planId: plan.id,
        source: input.source,
        sourceState: input.sourceState as Prisma.InputJsonValue | undefined,
        status: input.status,
        trialEndsAt: input.trialEndsAt,
        trialStartsAt: input.trialStartsAt,
      },
      where: { tenantId: input.tenantId },
    })
    await transaction.auditLog.create({
      data: {
        action: "subscription.transition",
        actorType: input.actorUserId ? "user" : "system",
        actorUserId: input.actorUserId ?? null,
        entityId: subscription.id,
        entityType: "tenant_subscription",
        metadata: {
          fromPlanId: previous?.planId ?? null,
          fromStatus: previous?.status ?? null,
          reason: input.reason,
          source: input.source,
          toPlanCode: input.planCode,
          toStatus: input.status,
        },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })
    return subscription
  })
}

export async function createSubscriptionCheckoutIntent(
  input: {
    idempotencyKey: string
    requestedByUserId?: string | null
    requestedPlanCode: SubscriptionPlanCode
    requestState?: Record<string, unknown>
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await ensureSubscriptionPlans(prisma)
  const requestedPlan = await prisma.subscriptionPlan.findUnique({
    where: { code: input.requestedPlanCode },
  })
  if (!requestedPlan?.isActive || !requestedPlan.isPublic) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      internalMessage: `Subscription plan ${input.requestedPlanCode} is not publicly requestable.`,
      operation: "subscription.checkout_intent",
      publicMessage: "This subscription plan is not currently available.",
    })
  }

  const subscription = await ensureTenantSubscription(input.tenantId, prisma)
  if (!subscription) throw new QueryInfrastructureError("Tenant subscription was not provisioned")

  const intent = await prisma.subscriptionCheckoutIntent.upsert({
    create: {
      idempotencyKey: input.idempotencyKey,
      requestedByUserId: input.requestedByUserId,
      requestedPlanCode: input.requestedPlanCode,
      requestState: input.requestState as Prisma.InputJsonValue | undefined,
      tenantSubscriptionId: subscription.id,
      tenantId: input.tenantId,
    },
    update: {},
    where: {
      tenantId_idempotencyKey: {
        idempotencyKey: input.idempotencyKey,
        tenantId: input.tenantId,
      },
    },
  })

  if (intent.requestedPlanCode !== input.requestedPlanCode) {
    throw new AppError({
      code: "CONFLICT",
      internalMessage:
        "A subscription checkout idempotency key was reused for another plan.",
      operation: "subscription.checkout_intent",
      publicMessage:
        "This plan request conflicts with an earlier request. Refresh and try again.",
    })
  }

  return intent
}

export async function recordSubscriptionProviderEvent(
  input: {
    eventType: string
    occurredAt: Date
    payload?: Record<string, unknown>
    payloadHash: string
    providerEventId: string
    providerName: string
    tenantId?: string | null
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  try {
    const event = await prisma.subscriptionProviderEvent.create({
      data: {
        eventType: input.eventType,
        occurredAt: input.occurredAt,
        payload: input.payload as Prisma.InputJsonValue | undefined,
        payloadHash: input.payloadHash,
        providerEventId: input.providerEventId,
        providerName: input.providerName,
        tenantId: input.tenantId,
        attempts: 1,
      },
    })
    return { duplicate: false as const, event }
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
    const event = await prisma.subscriptionProviderEvent.findUniqueOrThrow({
      where: {
        providerName_providerEventId: {
          providerEventId: input.providerEventId,
          providerName: input.providerName,
        },
      },
    })
    if (
      event.payloadHash !== input.payloadHash ||
      event.tenantId !== (input.tenantId ?? null)
    ) {
      throw new AppError({
        code: "CONFLICT",
        internalMessage:
          "A provider event identifier was reused with different tenant or payload evidence.",
        operation: "subscription.provider_event",
        publicMessage: "The billing event could not be reconciled safely.",
      })
    }
    const redelivered = await prisma.subscriptionProviderEvent.update({
      where: { id: event.id },
      data: { attempts: { increment: 1 } },
    })
    return { duplicate: true as const, event: redelivered }
  }
}

async function reconcileTenantSubscriptionLifecycle(
  subscription: SubscriptionWithPlanAndAddons,
  now: Date,
  prisma: SubscriptionDbClient
) {
  const effectiveStatus = resolveEffectiveSubscriptionStatus({
    source: subscription.source,
    currentPeriodEndsAt: subscription.currentPeriodEndsAt,
    graceEndsAt: subscription.graceEndsAt,
    now,
    status: subscription.status,
    trialEndsAt: subscription.trialEndsAt,
  })
  if (effectiveStatus === subscription.status) return subscription

  return withSubscriptionTransaction(prisma, async (transaction) => {
    const updated = await transaction.tenantSubscription.updateMany({
      data: {
        status: effectiveStatus,
        ...(effectiveStatus === "suspended" && { endedAt: now }),
      },
      where: {
        id: subscription.id,
        status: subscription.status,
        updatedAt: subscription.updatedAt,
      },
    })
    if (updated.count === 1) {
      await transaction.auditLog.create({
        data: {
          action: "subscription.lifecycle_reconciled",
          actorType: "system",
          entityId: subscription.id,
          entityType: "tenant_subscription",
          metadata: {
            fromStatus: subscription.status,
            reason: lifecycleTransitionReason(subscription.status),
            toStatus: effectiveStatus,
          },
          occurredAt: now,
          tenantId: subscription.tenantId,
        },
      })
    }

    return transaction.tenantSubscription.findUniqueOrThrow({
      include: { addons: true, plan: true },
      where: { id: subscription.id },
    })
  })
}

async function withSubscriptionTransaction<T>(
  prisma: SubscriptionDbClient,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
) {
  const client = prisma as PrismaClient
  if (typeof client.$transaction === "function") {
    return client.$transaction(operation)
  }
  return operation(prisma as Prisma.TransactionClient)
}

function lifecycleTransitionReason(status: SubscriptionStatus) {
  if (status === "past_due") return "payment_grace_policy"
  if (status === "grace") return "grace_period_expired"
  return "trial_or_beta_period_expired"
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000)
}

function toRecord(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  )
}
