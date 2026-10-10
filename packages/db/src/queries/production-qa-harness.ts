import { QueryInfrastructureError } from "../query-error"
import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import {
  createProductionQaHarnessEvidenceReport,
  createProductionQaHarnessPlan,
  evaluateProductionQaHarnessStateMaterialization,
  PRODUCTION_QA_HARNESS_SERVICE_KEYS,
  type ProductionQaHarnessExecutionResult,
  type ProductionQaHarnessPlan,
  type ProductionQaHarnessScenarioPlan,
} from "@halaalvest/domain"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { ensureSubscriptionPlans } from "./subscriptions"
import {
  ensureProductionQaHarnessOverdueFixture,
  ensureProductionQaHarnessPendingReviewFixture,
  ensureProductionQaHarnessPublishedProfitFixture,
  ensureProductionQaHarnessStaleStateFixture,
  type ProductionQaHarnessFixtureResult,
} from "./production-qa-harness-fixtures"

type ProductionQaHarnessEnvironment = "local" | "development" | "preview"

const PRODUCTION_QA_HARNESS_TENANT_POLICY = {
  activeFinancingBlocksEmergency: true,
  activeFinancingBlocksProcurement: true,
  disbursementRequiresDeployableFunds: true,
  loanEligibilityMultiple: 2,
  monthlyLevyAmount: 500,
  normalLoanAllocationPercentage: 70,
  normalLoanTermMonths: 18,
  procurementMaximumActiveObligationsPerMember: 1,
  quickLoanAllocationPercentage: 30,
  quickLoanTermMonths: 3,
  requiresDualLoanApproval: true,
  reserveBufferAmount: 250_000,
} as const

const PRODUCTION_QA_HARNESS_ADDONS = {
  member_login: {
    displayName: "Member login",
    entitlementOverrides: { memberLogin: true },
  },
} as const

export type ProductionQaHarnessCollision = {
  category:
    | "live_tenant_collision"
    | "qa_domain_mismatch"
    | "identifier_collision"
  detail: string
  scenarioKey: string
}

function requirePrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    throw new Error(
      "Production-contract QA harness requires HALAALVEST_DATABASE_URL."
    )
  }
  return prisma
}

export function buildProductionQaHarnessScenarioSeed(input: {
  now: Date
  qaDomain: string
  runId: string
  scenario: ProductionQaHarnessScenarioPlan
}) {
  const isFreeBeta = input.scenario.planCode === "free_beta"
  const isEnterprise = input.scenario.planCode === "enterprise"
  const isBlocked = input.scenario.state === "blocked"
  const trialEndsAt = isFreeBeta
    ? new Date(input.now.getTime() + 90 * 24 * 60 * 60 * 1000)
    : null
  const currentPeriodEndsAt = new Date(
    input.now.getTime() + 30 * 24 * 60 * 60 * 1000
  )
  const memberJoinedAt =
    input.scenario.state === "stale"
      ? new Date(
          Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), 1)
        )
      : new Date("2026-01-01T00:00:00.000Z")

  return {
    member: {
      joinedAt: memberJoinedAt,
      kycStatus:
        input.scenario.state === "kyc_incomplete" ||
        input.scenario.state === "empty"
          ? ("not_started" as const)
          : ("verified" as const),
      totalSavingsSnapshot: input.scenario.state === "empty" ? 0 : 250_000,
    },
    operationProfile: {
      reviewedAt: input.now,
      serviceModes: input.scenario.serviceModes,
    },
    subscription: {
      activeMemberLimitOverride:
        input.scenario.state === "at_capacity" ? 1 : null,
      currentPeriodEndsAt: isFreeBeta ? null : currentPeriodEndsAt,
      currentPeriodStartsAt: isFreeBeta ? null : input.now,
      graceEndsAt: isFreeBeta
        ? new Date(trialEndsAt!.getTime() + 14 * 24 * 60 * 60 * 1000)
        : null,
      source: isFreeBeta
        ? ("free_beta" as const)
        : isEnterprise
          ? ("enterprise_contract" as const)
          : ("manual" as const),
      sourceState: {
        harnessContractVersion: 1,
        initializedBy: "production_contract_qa_harness",
        qaDomain: input.qaDomain,
        runId: input.runId,
        scenarioKey: input.scenario.key,
        scenarioState: input.scenario.state,
      },
      status: isBlocked
        ? ("suspended" as const)
        : isFreeBeta
          ? ("free_beta" as const)
          : isEnterprise
            ? ("enterprise" as const)
            : ("active" as const),
      trialEndsAt,
      trialStartsAt: isFreeBeta ? input.now : null,
    },
    tenantPolicy: { ...PRODUCTION_QA_HARNESS_TENANT_POLICY },
  }
}

export async function previewProductionQaHarness(
  input: {
    environment: ProductionQaHarnessEnvironment | string
    now?: Date
    qaDomain: string
    runId: string
  },
  prismaOverride?: PrismaClient
) {
  const plan = createProductionQaHarnessPlan(input)
  const prisma = requirePrisma(prismaOverride)
  const slugs = plan.scenarios.map(({ slug }) => slug)
  const prefixes = plan.scenarios.map(
    ({ cooperativeCodePrefix }) => cooperativeCodePrefix
  )
  const cooperativeNumbers = plan.scenarios.flatMap(({ identities }) =>
    identities.map(({ cooperativeNumber }) => cooperativeNumber)
  )

  const [tenants, users] = await Promise.all([
    prisma.tenant.findMany({
      select: {
        cooperativeCodePrefix: true,
        dataClassification: true,
        id: true,
        qaSourceDomain: true,
        slug: true,
      },
      where: {
        OR: [
          { slug: { in: slugs } },
          { cooperativeCodePrefix: { in: prefixes } },
        ],
      },
    }),
    prisma.user.findMany({
      select: {
        cooperativeAccessCode: true,
        tenantId: true,
      },
      where: { cooperativeAccessCode: { in: cooperativeNumbers } },
    }),
  ])

  const collisions: ProductionQaHarnessCollision[] = []
  const existingByScenario = new Map<string, string>()
  for (const tenant of tenants) {
    const scenario = plan.scenarios.find(
      (candidate) =>
        candidate.slug === tenant.slug ||
        candidate.cooperativeCodePrefix === tenant.cooperativeCodePrefix
    )
    if (!scenario) continue

    const identifiersMatch =
      scenario.slug === tenant.slug &&
      scenario.cooperativeCodePrefix === tenant.cooperativeCodePrefix
    if (!identifiersMatch) {
      collisions.push({
        category: "identifier_collision",
        detail:
          "A stable QA harness slug or cooperative prefix is already in use.",
        scenarioKey: scenario.key,
      })
      continue
    }
    if (tenant.dataClassification !== "qa") {
      collisions.push({
        category: "live_tenant_collision",
        detail: "A live tenant occupies the stable QA harness identity.",
        scenarioKey: scenario.key,
      })
      continue
    }
    if (tenant.qaSourceDomain !== plan.qaDomain) {
      collisions.push({
        category: "qa_domain_mismatch",
        detail: "The existing QA tenant belongs to another source domain.",
        scenarioKey: scenario.key,
      })
      continue
    }
    existingByScenario.set(scenario.key, tenant.id)
  }

  for (const user of users) {
    const scenario = plan.scenarios.find(({ identities }) =>
      identities.some(
        ({ cooperativeNumber }) =>
          cooperativeNumber === user.cooperativeAccessCode
      )
    )
    if (!scenario) continue
    const expectedTenantId = existingByScenario.get(scenario.key)
    if (!expectedTenantId || user.tenantId !== expectedTenantId) {
      collisions.push({
        category: "identifier_collision",
        detail: "A stable QA cooperative number is already in use.",
        scenarioKey: scenario.key,
      })
    }
  }

  const uniqueCollisions = [
    ...new Map(
      collisions.map((collision) => [
        `${collision.scenarioKey}:${collision.category}:${collision.detail}`,
        collision,
      ])
    ).values(),
  ]

  return {
    canProvision: uniqueCollisions.length === 0,
    collisions: uniqueCollisions,
    plan,
    scenarios: plan.scenarios.map((scenario) => ({
      existingTenantId: existingByScenario.get(scenario.key) ?? null,
      key: scenario.key,
      status: existingByScenario.has(scenario.key) ? "existing" : "new",
    })),
  }
}

export async function provisionProductionQaHarness(
  input: {
    environment: ProductionQaHarnessEnvironment | string
    now?: Date
    qaDomain: string
    runId: string
  },
  prismaOverride?: PrismaClient
) {
  const now = input.now ?? new Date()
  const prisma = requirePrisma(prismaOverride)
  const preview = await previewProductionQaHarness({ ...input, now }, prisma)
  if (!preview.canProvision) {
    throw ExpectedQueryError.conflict(
      `QA harness preview found ${preview.collisions.length} unsafe collision(s).`
    )
  }

  await ensureSubscriptionPlans(prisma)
  const results: ProductionQaHarnessExecutionResult[] = []

  for (const scenario of preview.plan.scenarios) {
    try {
      const tenantId = await prisma.$transaction(async (transaction) =>
        provisionScenario({
          now,
          plan: preview.plan,
          scenario,
          transaction,
        })
      )
      results.push({
        scenarioKey: scenario.key,
        status: "provisioned",
        tenantId,
      })
    } catch {
      results.push({
        errorCode: "provision_failed",
        scenarioKey: scenario.key,
        status: "failed",
      })
    }
  }

  const fixtureResults: Array<
    | ProductionQaHarnessFixtureResult
    | {
        errorCode: "fixture_provision_failed"
        scenarioKey: string
        state: "overdue" | "pending_review" | "published_profit" | "stale"
        status: "failed"
      }
  > = []
  try {
    fixtureResults.push(
      await ensureProductionQaHarnessOverdueFixture({
        now,
        plan: preview.plan,
        prisma,
      })
    )
  } catch {
    fixtureResults.push({
      errorCode: "fixture_provision_failed",
      scenarioKey: "growth-overdue",
      state: "overdue",
      status: "failed",
    })
  }
  try {
    fixtureResults.push(
      await ensureProductionQaHarnessPendingReviewFixture({
        now,
        plan: preview.plan,
        prisma,
      })
    )
  } catch {
    fixtureResults.push({
      errorCode: "fixture_provision_failed",
      scenarioKey: "standard-review",
      state: "pending_review",
      status: "failed",
    })
  }
  try {
    fixtureResults.push(
      await ensureProductionQaHarnessStaleStateFixture({
        now,
        plan: preview.plan,
        prisma,
      })
    )
  } catch {
    fixtureResults.push({
      errorCode: "fixture_provision_failed",
      scenarioKey: "enterprise-stale",
      state: "stale",
      status: "failed",
    })
  }
  try {
    fixtureResults.push(
      await ensureProductionQaHarnessPublishedProfitFixture({
        now,
        plan: preview.plan,
        prisma,
      })
    )
  } catch {
    fixtureResults.push({
      errorCode: "fixture_provision_failed",
      scenarioKey: "enterprise-profit",
      state: "published_profit",
      status: "failed",
    })
  }

  const stateCoverage = await inspectProductionQaHarnessStateCoverage(
    { ...input, now },
    prisma
  )

  return {
    complete:
      results.every(({ status }) => status === "provisioned") &&
      fixtureResults.every(({ status }) => status !== "failed"),
    fixtureResults,
    plan: preview.plan,
    report: createProductionQaHarnessEvidenceReport({
      generatedAt: now,
      plan: preview.plan,
      results,
    }),
    results,
    stateCoverage,
  }
}

export async function inspectProductionQaHarnessStateCoverage(
  input: {
    environment: ProductionQaHarnessEnvironment | string
    now?: Date
    qaDomain: string
    runId: string
  },
  prismaOverride?: PrismaClient
) {
  const now = input.now ?? new Date()
  const plan = createProductionQaHarnessPlan({ ...input, now })
  const prisma = requirePrisma(prismaOverride)
  const tenants = await prisma.tenant.findMany({
    select: {
      _count: {
        select: {
          contributions: true,
          dividendPeriods: true,
          foodPurchaseApplications: true,
          loanRequests: true,
          memberPaymentReceipts: true,
          procurementRequests: true,
          projectFinancingRequests: true,
          supportCases: true,
        },
      },
      auditLogs: {
        select: { entityId: true },
        where: {
          action:
            "qa.production_contract.operation_profile.stale_state_rejected",
        },
      },
      dividendPeriods: {
        select: { id: true },
        take: 1,
        where: { status: "published" },
      },
      foodPurchaseApplications: {
        select: { id: true },
        take: 1,
        where: { status: { in: ["submitted", "under_review"] } },
      },
      id: true,
      loanRequests: {
        select: { id: true },
        take: 1,
        where: { status: { in: ["submitted", "under_review"] } },
      },
      memberPaymentReceipts: {
        select: { id: true },
        take: 1,
        where: { status: { in: ["submitted", "under_review"] } },
      },
      members: {
        select: { kycStatus: true, status: true },
      },
      procurementRequests: {
        select: { id: true },
        take: 1,
        where: { status: { in: ["submitted", "under_review"] } },
      },
      projectFinancingRequests: {
        select: { id: true },
        take: 1,
        where: { status: { in: ["submitted", "under_review"] } },
      },
      repaymentSchedules: {
        select: { id: true },
        take: 1,
        where: {
          dueAt: { lt: now },
          status: { in: ["due", "overdue", "partially_paid"] },
        },
      },
      slug: true,
      status: true,
      subscription: {
        select: {
          activeMemberLimitOverride: true,
          addons: {
            select: {
              code: true,
              endsAt: true,
              startsAt: true,
              status: true,
            },
          },
          status: true,
        },
      },
      serviceSettings: {
        select: { accessMode: true, id: true, serviceKey: true },
        where: { serviceKey: "procurement" },
      },
    },
    where: {
      dataClassification: "qa",
      qaSourceDomain: plan.qaDomain,
      slug: { in: plan.scenarios.map(({ slug }) => slug) },
    },
  })
  const tenantsBySlug = new Map(tenants.map((tenant) => [tenant.slug, tenant]))
  const scenarios = plan.scenarios.map((scenario) => {
    const tenant = tenantsBySlug.get(scenario.slug)
    const counts = tenant?._count
    const productRecordCount = counts
      ? Object.values(counts).reduce((sum, count) => sum + count, 0)
      : 0
    const activeMembers =
      tenant?.members.filter(({ status }) => status === "active") ?? []
    const activeAddonCodes =
      tenant?.subscription?.addons
        .filter(
          ({ endsAt, startsAt, status }) =>
            status === "active" && startsAt <= now && (!endsAt || endsAt > now)
        )
        .map(({ code }) => code)
        .sort() ?? []
    const plannedActiveAddonCodes = [...scenario.activeAddonCodes].sort()
    const activeAddonPlanMatches =
      activeAddonCodes.length === plannedActiveAddonCodes.length &&
      activeAddonCodes.every(
        (code, index) => code === plannedActiveAddonCodes[index]
      )
    const evaluation = evaluateProductionQaHarnessStateMaterialization({
      facts: {
        activeMemberCount: activeMembers.length,
        activeMemberLimit:
          tenant?.subscription?.activeMemberLimitOverride ?? null,
        hasKycIncompleteMember: activeMembers.some(
          ({ kycStatus }) => kycStatus !== "verified"
        ),
        hasOverdueSchedule: Boolean(tenant?.repaymentSchedules.length),
        hasPendingReview: Boolean(
          tenant &&
          (tenant.memberPaymentReceipts.length ||
            tenant.loanRequests.length ||
            tenant.procurementRequests.length ||
            tenant.foodPurchaseApplications.length ||
            tenant.projectFinancingRequests.length)
        ),
        hasPublishedProfit: Boolean(tenant?.dividendPeriods.length),
        hasStaleRecord: Boolean(
          tenant?.auditLogs.some(({ entityId }) =>
            tenant.serviceSettings.some(
              (setting) =>
                setting.id === entityId &&
                setting.accessMode === scenario.serviceModes.procurement
            )
          )
        ),
        hasVerifiedActiveMember: activeMembers.some(
          ({ kycStatus }) => kycStatus === "verified"
        ),
        productRecordCount,
        subscriptionStatus: tenant?.subscription?.status ?? null,
        tenantStatus: tenant?.status ?? null,
      },
      state: scenario.state,
    })

    return {
      ...evaluation,
      activeAddonCodes,
      activeAddonPlanMatches,
      scenarioKey: scenario.key,
      tenantId: tenant?.id ?? null,
    }
  })

  return {
    complete: scenarios.every(
      ({ activeAddonPlanMatches, materialized }) =>
        materialized && activeAddonPlanMatches
    ),
    expectedStateCount: scenarios.length,
    materializedStateCount: scenarios.filter(({ materialized }) => materialized)
      .length,
    scenarios,
  }
}

async function provisionScenario(input: {
  now: Date
  plan: ProductionQaHarnessPlan
  scenario: ProductionQaHarnessScenarioPlan
  transaction: Prisma.TransactionClient
}) {
  const seed = buildProductionQaHarnessScenarioSeed({
    now: input.now,
    qaDomain: input.plan.qaDomain,
    runId: input.plan.runId,
    scenario: input.scenario,
  })
  const tenant = await input.transaction.tenant.upsert({
    create: {
      cooperativeCodePrefix: input.scenario.cooperativeCodePrefix,
      currencyCode: "NGN",
      dataClassification: "qa",
      initialMigrationStatus: "live_operations",
      memberNumberPrefix: input.scenario.memberNumberPrefix,
      name: input.scenario.name,
      qaMarkedAt: input.now,
      qaSourceDomain: input.plan.qaDomain,
      slug: input.scenario.slug,
      status: "active",
      timezone: "Africa/Lagos",
    },
    update: {
      cooperativeCodePrefix: input.scenario.cooperativeCodePrefix,
      currencyCode: "NGN",
      dataClassification: "qa",
      initialMigrationStatus: "live_operations",
      memberNumberPrefix: input.scenario.memberNumberPrefix,
      name: input.scenario.name,
      qaMarkedAt: input.now,
      qaPurgeStartedAt: null,
      qaSourceDomain: input.plan.qaDomain,
      status: "active",
      timezone: "Africa/Lagos",
    },
    where: { slug: input.scenario.slug },
  })

  await input.transaction.tenantPolicy.upsert({
    create: {
      ...seed.tenantPolicy,
      tenantId: tenant.id,
    },
    update: seed.tenantPolicy,
    where: { tenantId: tenant.id },
  })

  const plan = await input.transaction.subscriptionPlan.findUnique({
    select: { id: true },
    where: { code: input.scenario.planCode },
  })
  if (!plan) {
    throw new QueryInfrastructureError(`Subscription plan ${input.scenario.planCode} is missing.`)
  }
  const subscription = await input.transaction.tenantSubscription.upsert({
    create: {
      ...seed.subscription,
      planId: plan.id,
      sourceState: seed.subscription
        .sourceState as unknown as Prisma.InputJsonValue,
      tenantId: tenant.id,
    },
    update: {
      ...seed.subscription,
      planId: plan.id,
      providerCustomerId: null,
      providerName: null,
      providerSubscriptionId: null,
      sourceState: seed.subscription
        .sourceState as unknown as Prisma.InputJsonValue,
    },
    where: { tenantId: tenant.id },
  })
  await input.transaction.tenantSubscriptionAddon.deleteMany({
    where: {
      tenantSubscriptionId: subscription.id,
      ...(input.scenario.activeAddonCodes.length > 0
        ? { code: { notIn: input.scenario.activeAddonCodes } }
        : {}),
    },
  })
  for (const code of input.scenario.activeAddonCodes) {
    const addon =
      PRODUCTION_QA_HARNESS_ADDONS[
        code as keyof typeof PRODUCTION_QA_HARNESS_ADDONS
      ]
    if (!addon) {
      throw new QueryInfrastructureError(`Unsupported production QA harness add-on: ${code}.`)
    }
    await input.transaction.tenantSubscriptionAddon.upsert({
      create: {
        code,
        displayName: addon.displayName,
        entitlementOverrides: addon.entitlementOverrides,
        startsAt: input.now,
        status: "active",
        tenantId: tenant.id,
        tenantSubscriptionId: subscription.id,
      },
      update: {
        displayName: addon.displayName,
        endsAt: null,
        entitlementOverrides: addon.entitlementOverrides,
        providerAddonId: null,
        startsAt: input.now,
        status: "active",
      },
      where: {
        tenantSubscriptionId_code: {
          code,
          tenantSubscriptionId: subscription.id,
        },
      },
    })
  }

  const operationProfile =
    await input.transaction.tenantOperationProfile.upsert({
      create: {
        reviewedAt: seed.operationProfile.reviewedAt,
        tenantId: tenant.id,
      },
      update: {
        reviewedAt: seed.operationProfile.reviewedAt,
        reviewedByUserId: null,
      },
      where: { tenantId: tenant.id },
    })
  for (const serviceKey of PRODUCTION_QA_HARNESS_SERVICE_KEYS) {
    const accessMode = seed.operationProfile.serviceModes[serviceKey]
    await input.transaction.tenantServiceSetting.upsert({
      create: {
        accessMode,
        operationProfileId: operationProfile.id,
        serviceKey,
        tenantId: tenant.id,
      },
      update: { accessMode, operationProfileId: operationProfile.id },
      where: {
        tenantId_serviceKey: { serviceKey, tenantId: tenant.id },
      },
    })
  }

  for (const identity of input.scenario.identities) {
    const user = await input.transaction.user.upsert({
      create: {
        cooperativeAccessCode: identity.cooperativeNumber,
        email: identity.email,
        fullName: identity.fullName,
        tenantId: tenant.id,
      },
      update: {
        cooperativeAccessCode: identity.cooperativeNumber,
        deletedAt: null,
        fullName: identity.fullName,
        passwordHash: null,
      },
      where: {
        tenantId_email: { email: identity.email, tenantId: tenant.id },
      },
    })
    for (const [index, role] of [
      identity.role,
      ...identity.secondaryRoles,
    ].entries()) {
      const isDefault = index === 0
      await input.transaction.membership.upsert({
        create: {
          isDefault,
          role,
          tenantId: tenant.id,
          userId: user.id,
        },
        update: { isDefault },
        where: {
          tenantId_userId_role: {
            role,
            tenantId: tenant.id,
            userId: user.id,
          },
        },
      })
    }
    if (
      (identity.role === "member" ||
        identity.secondaryRoles.includes("member")) &&
      identity.memberNumber
    ) {
      await input.transaction.member.upsert({
        create: {
          email: identity.email,
          fullName: identity.fullName,
          joinedAt: seed.member.joinedAt,
          kycStatus: seed.member.kycStatus,
          memberNumber: identity.memberNumber,
          memberType: "individual",
          status: "active",
          tenantId: tenant.id,
          totalSavingsSnapshot: seed.member.totalSavingsSnapshot,
          userId: user.id,
        },
        update: {
          email: identity.email,
          fullName: identity.fullName,
          kycStatus: seed.member.kycStatus,
          memberNumber: identity.memberNumber,
          status: "active",
          ...(input.scenario.state === "stale"
            ? { joinedAt: seed.member.joinedAt }
            : {}),
          ...(input.scenario.state === "overdue"
            ? {}
            : { totalSavingsSnapshot: seed.member.totalSavingsSnapshot }),
        },
        where: { userId: user.id },
      })
    }
  }

  return tenant.id
}
