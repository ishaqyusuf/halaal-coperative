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
import {
  ensureProductionQaHarnessOverdueFixture,
  ensureProductionQaHarnessPendingReviewFixture,
  ensureProductionQaHarnessPublishedProfitFixture,
  ensureProductionQaHarnessStaleStateFixture,
  type ProductionQaHarnessFixtureResult,
} from "./production-qa-harness-fixtures"
import {
  ensureProductionQaHarnessMemberReadyFixture,
  PRODUCTION_QA_MEMBER_READY_FIXTURE,
  type ProductionQaMemberReadyFixtureResult,
} from "./production-qa-harness-member-ready-fixture"
import { resolveMemberOperationalReadiness } from "./member-readiness"

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
  const isSetupStage = input.scenario.state === "setup_migration"
  // The ready member's savings arrive through an applied brought-forward
  // opening balance, so the snapshot starts at zero and the ledger fills it.
  const isMemberReady = input.scenario.state === "member_ready"
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
      totalSavingsSnapshot:
        input.scenario.state === "empty" || isMemberReady ? 0 : 250_000,
    },
    // The setup-stage cooperative is mid-migration: finance start date and a
    // monthly levy schedule are in place, so every import kind can be tried,
    // and re-provisioning puts it back before go-live.
    migration: isSetupStage
      ? {
          initialMigrationStatus: "historical_setup_in_progress" as const,
          migrationEmergencyUnlockUntil: null,
          migrationFinalizedAt: null,
          startDate: new Date(Date.UTC(input.now.getUTCFullYear() - 1, 0, 1)),
        }
      : { initialMigrationStatus: "live_operations" as const },
    setupChargeSchedule: isSetupStage
      ? {
          amount: PRODUCTION_QA_HARNESS_TENANT_POLICY.monthlyLevyAmount,
          code: "QA-MONTHLY-LEVY",
          effectiveFrom: new Date(
            Date.UTC(input.now.getUTCFullYear() - 1, 0, 1)
          ),
          name: "Monthly levy",
        }
      : null,
    operationProfile: {
      reviewedAt: input.now,
      serviceModes: input.scenario.serviceModes,
    },
    tenantPolicy: {
      ...PRODUCTION_QA_HARNESS_TENANT_POLICY,
      ...(isMemberReady
        ? { migrationSetupMode: "brought_forward" as const }
        : {}),
    },
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
    /**
     * Provision only these scenarios (for example `["standard-setup"]`), so
     * re-seeding one QA cooperative leaves the others' QA data alone.
     * Omitted or empty means every scenario.
     */
    scenarioKeys?: readonly string[]
  },
  prismaOverride?: PrismaClient
) {
  const now = input.now ?? new Date()
  const prisma = requirePrisma(prismaOverride)
  const preview = await previewProductionQaHarness({ ...input, now }, prisma)
  const selectedKeys = selectProductionQaHarnessScenarioKeys(
    preview.plan,
    input.scenarioKeys
  )
  const blockingCollisions = preview.collisions.filter(({ scenarioKey }) =>
    selectedKeys.has(scenarioKey)
  )
  if (blockingCollisions.length > 0) {
    throw ExpectedQueryError.conflict(
      `QA harness preview found ${blockingCollisions.length} unsafe collision(s).`
    )
  }

  const results: ProductionQaHarnessExecutionResult[] = []

  for (const scenario of preview.plan.scenarios.filter(({ key }) =>
    selectedKeys.has(key)
  )) {
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
    | ProductionQaMemberReadyFixtureResult
    | {
        errorCode: "fixture_provision_failed"
        scenarioKey: string
        state:
          | "member_ready"
          | "overdue"
          | "pending_review"
          | "published_profit"
          | "stale"
        status: "failed"
      }
  > = []
  if (selectedKeys.has("growth-overdue")) {
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
  }
  if (selectedKeys.has("standard-review")) {
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
  }
  if (selectedKeys.has("enterprise-stale")) {
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
  }
  if (selectedKeys.has("enterprise-profit")) {
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
  }

  if (selectedKeys.has("standard-ready")) {
    try {
      fixtureResults.push(
        await ensureProductionQaHarnessMemberReadyFixture({
          now,
          plan: preview.plan,
          prisma,
        })
      )
    } catch {
      fixtureResults.push({
        errorCode: "fixture_provision_failed",
        scenarioKey: "standard-ready",
        state: "member_ready",
        status: "failed",
      })
    }
  }

  const fullStateCoverage = await inspectProductionQaHarnessStateCoverage(
    { ...input, now },
    prisma
  )
  const coveredScenarios = fullStateCoverage.scenarios.filter(
    ({ scenarioKey }) => selectedKeys.has(scenarioKey)
  )
  const stateCoverage = {
    complete: coveredScenarios.every(({ materialized }) => materialized),
    expectedStateCount: coveredScenarios.length,
    materializedStateCount: coveredScenarios.filter(
      ({ materialized }) => materialized
    ).length,
    scenarios: coveredScenarios,
  }

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

export function selectProductionQaHarnessScenarioKeys(
  plan: ProductionQaHarnessPlan,
  scenarioKeys?: readonly string[]
) {
  const knownKeys = plan.scenarios.map(({ key }) => key)
  const requested = (scenarioKeys ?? [])
    .map((key) => key.trim())
    .filter(Boolean)
  if (requested.length === 0) return new Set(knownKeys)
  const unknown = requested.filter((key) => !knownKeys.includes(key))
  if (unknown.length > 0) {
    throw ExpectedQueryError.validation(
      `Unknown QA harness scenario: ${unknown.join(", ")}.`
    )
  }
  return new Set(requested)
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
      chargeApplicability: {
        select: { trigger: true, workflow: true },
        where: {
          chargeDefinition: { isActive: true },
          isActive: true,
          trigger: { in: ["submission", "approval"] },
          workflow: { in: [...PRODUCTION_QA_MEMBER_READY_FIXTURE.workflows] },
        },
      },
      chargeApplications: {
        select: { id: true },
        take: 1,
        where: { collectionMode: "pay_separately", status: "pending" },
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
      initialMigrationStatus: true,
      loanRequests: {
        select: { id: true },
        take: 1,
        where: { status: { in: ["submitted", "under_review"] } },
      },
      migrationEmergencyUnlockUntil: true,
      memberPaymentReceipts: {
        select: { id: true },
        take: 1,
        where: { status: { in: ["submitted", "under_review"] } },
      },
      members: {
        select: {
          joinedAt: true,
          kycStatus: true,
          openingBalances: {
            select: { id: true },
            take: 1,
            where: { status: "applied" },
          },
          status: true,
        },
      },
      policies: { select: { migrationSetupMode: true } },
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
      startDate: true,
      status: true,
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
    const evaluation = evaluateProductionQaHarnessStateMaterialization({
      facts: {
        hasKycIncompleteMember: activeMembers.some(
          ({ kycStatus }) => kycStatus !== "verified"
        ),
        // Brought-forward readiness only: backfill months are not loaded
        // here, so a historical-backfill member reads as not ready.
        hasOperationallyReadyMember: activeMembers.some(
          (member) =>
            resolveMemberOperationalReadiness(
              {
                appliedOpeningBalanceId: member.openingBalances[0]?.id,
                joinedAt: member.joinedAt,
                kycStatus: member.kycStatus,
                memberStatus: member.status,
                migrationSetupMode:
                  tenant?.policies?.migrationSetupMode === "brought_forward"
                    ? "brought_forward"
                    : "historical_backfill",
                tenantStartDate: tenant?.startDate,
              },
              now
            ).isReady
        ),
        hasPendingSeparateCharge: Boolean(tenant?.chargeApplications.length),
        hasRequestWorkflowCharges:
          PRODUCTION_QA_MEMBER_READY_FIXTURE.workflows.every((workflow) =>
            ["submission", "approval"].every((trigger) =>
              tenant?.chargeApplicability.some(
                (rule) => rule.workflow === workflow && rule.trigger === trigger
              )
            )
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
        hasRestrictedServices: Boolean(
          tenant?.serviceSettings.some(
            ({ accessMode }) => accessMode === "disabled"
          )
        ),
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
        migrationToolsOpen: Boolean(
          tenant &&
          (!["finalized", "live_operations"].includes(
            tenant.initialMigrationStatus
          ) ||
            (tenant.migrationEmergencyUnlockUntil &&
              tenant.migrationEmergencyUnlockUntil > now))
        ),
        productRecordCount,
        tenantStatus: tenant?.status ?? null,
      },
      state: scenario.state,
    })

    return {
      ...evaluation,
      scenarioKey: scenario.key,
      tenantId: tenant?.id ?? null,
    }
  })

  return {
    complete: scenarios.every(({ materialized }) => materialized),
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
      ...seed.migration,
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
      ...seed.migration,
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

  if (seed.setupChargeSchedule) {
    const charge = seed.setupChargeSchedule
    const definition = await input.transaction.chargeDefinition.upsert({
      create: {
        amount: charge.amount,
        code: charge.code,
        isMonthlyLevy: true,
        kind: "fixed",
        name: charge.name,
        tenantId: tenant.id,
      },
      update: { amount: charge.amount, isActive: true, name: charge.name },
      where: { tenantId_code: { code: charge.code, tenantId: tenant.id } },
    })
    await input.transaction.chargeDefinitionVersion.upsert({
      create: {
        amount: charge.amount,
        chargeDefinitionId: definition.id,
        effectiveFrom: charge.effectiveFrom,
        kind: "fixed",
        tenantId: tenant.id,
      },
      update: { amount: charge.amount },
      where: {
        chargeDefinitionId_effectiveFrom: {
          chargeDefinitionId: definition.id,
          effectiveFrom: charge.effectiveFrom,
        },
      },
    })
  }

  if (seed.setupChargeSchedule) {
    // "No past business profits": the last setup step that gates member
    // imports, recorded the way Finance setup records it.
    const reviewed = await input.transaction.auditLog.findFirst({
      select: { id: true },
      where: {
        action: "migration.business_profit_pools.reviewed",
        tenantId: tenant.id,
      },
    })
    if (!reviewed) {
      await input.transaction.auditLog.create({
        data: {
          action: "migration.business_profit_pools.reviewed",
          actorType: "system",
          entityId: tenant.id,
          entityType: "Tenant",
          metadata: { initializedBy: "production_contract_qa_harness" },
          occurredAt: input.now,
          tenantId: tenant.id,
        },
      })
    }
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
          // Overdue and member-ready savings come from ledger postings, so a
          // re-run leaves their cached snapshot alone.
          ...(input.scenario.state === "overdue" ||
          input.scenario.state === "member_ready"
            ? {}
            : { totalSavingsSnapshot: seed.member.totalSavingsSnapshot }),
        },
        where: { userId: user.id },
      })
    }
  }

  return tenant.id
}
