import { QueryInfrastructureError } from "../query-error"
import { createHash } from "node:crypto"
import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import {
  assertProductionQaHarnessPlan,
  PRODUCTION_QA_HARNESS_CLEANUP_CONFIRMATION,
  PRODUCTION_QA_HARNESS_CLEANUP_CONTRACT_VERSION,
  PRODUCTION_QA_HARNESS_CLEANUP_REHEARSAL_CONFIRMATION,
  type ProductionQaHarnessCleanupBlocker,
  type ProductionQaHarnessCleanupCounts,
  type ProductionQaHarnessCleanupPreview,
  type ProductionQaHarnessCleanupReceipt,
  type ProductionQaHarnessCleanupRehearsalReceipt,
  type ProductionQaHarnessPlan,
} from "@halaalvest/domain"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { deleteQaTenant, markQaTenantForPurge } from "./qa-maintenance"

type CleanupTenant = {
  _count: {
    domains: number
    memberDocuments: number
    dashboardEvidenceUploads: number
    subscriptionCheckoutIntents: number
    subscriptionInvoices: number
    subscriptionProviderEvents: number
  }
  cooperativeCodePrefix: string | null
  dataClassification: "live" | "qa"
  id: string
  name: string
  qaPurgeStartedAt: Date | null
  qaSourceDomain: string | null
  slug: string
  subscription: {
    addons: Array<{ providerAddonId: string | null }>
    providerCustomerId: string | null
    providerName: string | null
    providerSubscriptionId: string | null
  } | null
  updatedAt: Date
}

type CleanupTarget = {
  cooperativeCodePrefix: string
  id: string
  scenarioKey: string
  slug: string
  updatedAt: Date
}

type CleanupSession = {
  appVersion: string
  buildVariant: string
  deviceLabel: string
  platform: string
  revokedAt: Date | null
  tenantId: string
}

const emptyCounts = (): ProductionQaHarnessCleanupCounts => ({
  auditLogs: 0,
  ledgerTransactions: 0,
  memberDocuments: 0,
  members: 0,
  users: 0,
  workspaces: 0,
})

function assertCleanupPlan(plan: ProductionQaHarnessPlan) {
  assertProductionQaHarnessPlan(plan)
  if (
    !(["local", "development", "preview"] as const).includes(plan.environment)
  ) {
    throw ExpectedQueryError.permission(
      "Production-contract QA cleanup is unavailable in production."
    )
  }
}

function requirePrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    throw new Error(
      "Production-contract QA cleanup requires HALAALVEST_DATABASE_URL."
    )
  }
  return prisma
}

function addBlocker(
  blockers: ProductionQaHarnessCleanupPreview["blockers"],
  category: ProductionQaHarnessCleanupBlocker,
  scenarioKey: string
) {
  if (
    !blockers.some(
      (blocker) =>
        blocker.category === category && blocker.scenarioKey === scenarioKey
    )
  ) {
    blockers.push({ category, scenarioKey })
  }
}

function hasProviderResource(tenant: CleanupTenant) {
  return Boolean(
    tenant.subscription?.providerCustomerId ||
    tenant.subscription?.providerName ||
    tenant.subscription?.providerSubscriptionId ||
    tenant.subscription?.addons.some(
      ({ providerAddonId }) => providerAddonId
    ) ||
    tenant._count.subscriptionCheckoutIntents > 0 ||
    tenant._count.subscriptionInvoices > 0 ||
    tenant._count.subscriptionProviderEvents > 0
    || tenant._count.dashboardEvidenceUploads > 0
  )
}

function isRevokedProductionQaHarnessSession(session: CleanupSession) {
  return Boolean(
    session.revokedAt &&
    session.appVersion === "ticket-30-proof" &&
    session.buildVariant === "local-qa" &&
    session.deviceLabel === "Ticket 30 headless Android proof" &&
    session.platform === "android"
  )
}

async function markAndDeleteCleanupTargets(input: {
  plan: ProductionQaHarnessPlan
  startedAt: Date
  targets: CleanupTarget[]
  tx: Prisma.TransactionClient
}) {
  for (const target of input.targets) {
    const marked = await markQaTenantForPurge(
      {
        cooperativeCodePrefix: target.cooperativeCodePrefix,
        id: target.id,
        qaSourceDomain: input.plan.qaDomain,
        slug: target.slug,
        startedAt: input.startedAt,
        updatedAt: target.updatedAt,
      },
      input.tx
    )
    if (marked.count !== 1) {
      throw ExpectedQueryError.conflict(
        "Production-contract QA cleanup target changed. Preview again."
      )
    }

    await deleteQaTenant(target.id, input.tx, input.startedAt)
  }
}

async function inspectProductionQaHarnessCleanup(
  plan: ProductionQaHarnessPlan,
  prisma: PrismaClient
): Promise<{
  preview: ProductionQaHarnessCleanupPreview
  targets: CleanupTarget[]
}> {
  assertCleanupPlan(plan)
  const scenariosBySlug = new Map(
    plan.scenarios.map((scenario) => [scenario.slug, scenario])
  )
  const scenariosByPrefix = new Map(
    plan.scenarios.map((scenario) => [scenario.cooperativeCodePrefix, scenario])
  )
  const tenants = (await prisma.tenant.findMany({
    orderBy: { slug: "asc" },
    select: {
      _count: {
        select: {
          domains: true,
          memberDocuments: true,
          dashboardEvidenceUploads: true,
          subscriptionCheckoutIntents: true,
          subscriptionInvoices: true,
          subscriptionProviderEvents: true,
        },
      },
      cooperativeCodePrefix: true,
      dataClassification: true,
      id: true,
      name: true,
      qaPurgeStartedAt: true,
      qaSourceDomain: true,
      slug: true,
      subscription: {
        select: {
          addons: { select: { providerAddonId: true } },
          providerCustomerId: true,
          providerName: true,
          providerSubscriptionId: true,
        },
      },
      updatedAt: true,
    },
    where: {
      OR: [
        { slug: { in: [...scenariosBySlug.keys()] } },
        {
          cooperativeCodePrefix: {
            in: [...scenariosByPrefix.keys()],
          },
        },
      ],
    },
  })) as CleanupTenant[]
  const blockers: ProductionQaHarnessCleanupPreview["blockers"] = []
  const identityMatched = new Map<
    string,
    { scenarioKey: string; tenant: CleanupTenant }
  >()

  for (const tenant of tenants) {
    const slugScenario = scenariosBySlug.get(tenant.slug)
    const prefixScenario = tenant.cooperativeCodePrefix
      ? scenariosByPrefix.get(tenant.cooperativeCodePrefix)
      : undefined
    const scenario = slugScenario ?? prefixScenario
    if (!scenario) continue

    if (
      slugScenario?.key !== scenario.key ||
      prefixScenario?.key !== scenario.key ||
      tenant.slug !== scenario.slug ||
      tenant.cooperativeCodePrefix !== scenario.cooperativeCodePrefix ||
      tenant.name !== scenario.name
    ) {
      addBlocker(blockers, "identity_mismatch", scenario.key)
      continue
    }

    identityMatched.set(tenant.id, { scenarioKey: scenario.key, tenant })
    if (tenant.dataClassification !== "qa") {
      addBlocker(blockers, "live_classification", scenario.key)
    }
    if (tenant.qaSourceDomain !== plan.qaDomain) {
      addBlocker(blockers, "qa_domain_mismatch", scenario.key)
    }
    if (tenant.qaPurgeStartedAt) {
      addBlocker(blockers, "purge_in_progress", scenario.key)
    }
    if (tenant._count.domains > 0) {
      addBlocker(blockers, "custom_domain", scenario.key)
    }
    if (tenant._count.memberDocuments > 0) {
      addBlocker(blockers, "external_document", scenario.key)
    }
    if (hasProviderResource(tenant)) {
      addBlocker(blockers, "provider_resource", scenario.key)
    }
  }

  const matchedTenantIds = [...identityMatched.keys()]
  const [unsafeUsers, sessions] =
    matchedTenantIds.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.user.findMany({
            select: { tenantId: true },
            where: {
              OR: [{ isPlatformOwner: true }, { passwordHash: { not: null } }],
              tenantId: { in: matchedTenantIds },
            },
          }),
          prisma.mobileDeviceSession.findMany({
            select: {
              appVersion: true,
              buildVariant: true,
              deviceLabel: true,
              platform: true,
              revokedAt: true,
              tenantId: true,
            },
            where: { tenantId: { in: matchedTenantIds } },
          }),
        ])

  for (const unsafe of unsafeUsers) {
    const match = identityMatched.get(unsafe.tenantId)
    if (match) {
      addBlocker(blockers, "credential_or_session", match.scenarioKey)
    }
  }
  for (const session of sessions) {
    if (isRevokedProductionQaHarnessSession(session)) continue
    const match = identityMatched.get(session.tenantId)
    if (match) {
      addBlocker(blockers, "credential_or_session", match.scenarioKey)
    }
  }

  const blockedScenarios = new Set(
    blockers.map((blocker) => blocker.scenarioKey)
  )
  const targets = [...identityMatched.values()]
    .filter(({ scenarioKey }) => !blockedScenarios.has(scenarioKey))
    .map(({ scenarioKey, tenant }) => ({
      cooperativeCodePrefix: tenant.cooperativeCodePrefix!,
      id: tenant.id,
      scenarioKey,
      slug: tenant.slug,
      updatedAt: tenant.updatedAt,
    }))
    .sort((left, right) => left.scenarioKey.localeCompare(right.scenarioKey))
  const targetIds = targets.map(({ id }) => id)
  const counts =
    targetIds.length === 0
      ? emptyCounts()
      : {
          auditLogs: await prisma.auditLog.count({
            where: { tenantId: { in: targetIds } },
          }),
          ledgerTransactions: await prisma.ledgerTransaction.count({
            where: { tenantId: { in: targetIds } },
          }),
          memberDocuments: await prisma.memberDocument.count({
            where: { tenantId: { in: targetIds } },
          }),
          members: await prisma.member.count({
            where: { tenantId: { in: targetIds } },
          }),
          users: await prisma.user.count({
            where: { tenantId: { in: targetIds } },
          }),
          workspaces: targets.length,
        }
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        blockers,
        counts,
        plan: {
          contractVersion: plan.contractVersion,
          environment: plan.environment,
          qaDomain: plan.qaDomain,
          runId: plan.runId,
        },
        tenants: tenants.map((tenant) => ({
          cooperativeCodePrefix: tenant.cooperativeCodePrefix,
          dataClassification: tenant.dataClassification,
          domainCount: tenant._count.domains,
          id: tenant.id,
          memberDocumentCount: tenant._count.memberDocuments,
          name: tenant.name,
          providerResource: hasProviderResource(tenant),
          qaPurgeStartedAt: tenant.qaPurgeStartedAt?.toISOString() ?? null,
          qaSourceDomain: tenant.qaSourceDomain,
          slug: tenant.slug,
          updatedAt: tenant.updatedAt.toISOString(),
        })),
      })
    )
    .digest("hex")

  return {
    preview: {
      blockers,
      canPurge: blockers.length === 0 && targets.length > 0,
      contractVersion: PRODUCTION_QA_HARNESS_CLEANUP_CONTRACT_VERSION,
      counts,
      environment: plan.environment,
      fingerprint,
      presentScenarioKeys: targets.map(({ scenarioKey }) => scenarioKey),
      runId: plan.runId,
    },
    targets,
  }
}

export async function previewProductionQaHarnessCleanup(
  plan: ProductionQaHarnessPlan,
  prismaOverride?: PrismaClient
) {
  assertCleanupPlan(plan)
  const prisma = requirePrisma(prismaOverride)
  return (await inspectProductionQaHarnessCleanup(plan, prisma)).preview
}

export async function purgeProductionQaHarness(input: {
  confirmation: string
  expectedFingerprint: string
  now?: () => Date
  plan: ProductionQaHarnessPlan
  prismaOverride?: PrismaClient
}): Promise<ProductionQaHarnessCleanupReceipt> {
  if (input.confirmation !== PRODUCTION_QA_HARNESS_CLEANUP_CONFIRMATION) {
    throw ExpectedQueryError.permission(
      "Production-contract QA cleanup confirmation did not match."
    )
  }

  assertCleanupPlan(input.plan)
  const prisma = requirePrisma(input.prismaOverride)
  const inspected = await inspectProductionQaHarnessCleanup(input.plan, prisma)
  if (inspected.preview.fingerprint !== input.expectedFingerprint) {
    throw ExpectedQueryError.conflict(
      "Production-contract QA cleanup preview changed. Preview again."
    )
  }
  if (inspected.preview.blockers.length > 0) {
    throw ExpectedQueryError.precondition(
      "Production-contract QA cleanup has safety blockers."
    )
  }
  if (!inspected.preview.canPurge || inspected.targets.length === 0) {
    throw ExpectedQueryError.precondition(
      "There are no production-contract QA harness workspaces to purge."
    )
  }

  const now = input.now ?? (() => new Date())
  const startedAt = now()
  await prisma.$transaction(async (tx) => {
    await markAndDeleteCleanupTargets({
      plan: input.plan,
      startedAt,
      targets: inspected.targets,
      tx,
    })
  })

  const after = await previewProductionQaHarnessCleanup(input.plan, prisma)
  const completedAt = now()
  return {
    after: after.counts,
    before: inspected.preview.counts,
    completedAt: completedAt.toISOString(),
    complete:
      after.counts.workspaces === 0 &&
      after.presentScenarioKeys.length === 0 &&
      after.blockers.length === 0,
    contractVersion: PRODUCTION_QA_HARNESS_CLEANUP_CONTRACT_VERSION,
    deleted: inspected.preview.counts,
    deletedScenarioKeys: inspected.targets.map(
      ({ scenarioKey }) => scenarioKey
    ),
    environment: input.plan.environment,
    runId: input.plan.runId,
    startedAt: startedAt.toISOString(),
  }
}

export async function rehearseProductionQaHarnessCleanup(input: {
  confirmation: string
  expectedFingerprint: string
  now?: () => Date
  plan: ProductionQaHarnessPlan
  prismaOverride?: PrismaClient
}): Promise<ProductionQaHarnessCleanupRehearsalReceipt> {
  if (
    input.confirmation !== PRODUCTION_QA_HARNESS_CLEANUP_REHEARSAL_CONFIRMATION
  ) {
    throw ExpectedQueryError.permission(
      "Production-contract QA cleanup rehearsal confirmation did not match."
    )
  }

  assertCleanupPlan(input.plan)
  const prisma = requirePrisma(input.prismaOverride)
  const inspected = await inspectProductionQaHarnessCleanup(input.plan, prisma)
  if (inspected.preview.fingerprint !== input.expectedFingerprint) {
    throw ExpectedQueryError.conflict(
      "Production-contract QA cleanup preview changed. Preview again."
    )
  }
  if (inspected.preview.blockers.length > 0) {
    throw ExpectedQueryError.precondition(
      "Production-contract QA cleanup has safety blockers."
    )
  }
  if (!inspected.preview.canPurge || inspected.targets.length === 0) {
    throw ExpectedQueryError.precondition(
      "There are no production-contract QA harness workspaces to rehearse."
    )
  }

  const now = input.now ?? (() => new Date())
  const startedAt = now()
  const rollback = new Error("ROLLBACK_PRODUCTION_QA_HARNESS_CLEANUP")
  let deletedInsideTransaction = false

  try {
    await prisma.$transaction(
      async (tx) => {
        await markAndDeleteCleanupTargets({
          plan: input.plan,
          startedAt,
          targets: inspected.targets,
          tx,
        })
        const remaining = await tx.tenant.count({
          where: { id: { in: inspected.targets.map(({ id }) => id) } },
        })
        if (remaining !== 0) {
          throw new QueryInfrastructureError(
            "Production-contract QA cleanup rehearsal left target rows."
          )
        }
        deletedInsideTransaction = true
        throw rollback
      },
      { maxWait: 5_000, timeout: 60_000 }
    )
  } catch (error) {
    if (error !== rollback) throw error
  }

  const after = await previewProductionQaHarnessCleanup(input.plan, prisma)
  const rollbackVerified =
    deletedInsideTransaction &&
    after.fingerprint === inspected.preview.fingerprint &&
    JSON.stringify(after.counts) === JSON.stringify(inspected.preview.counts) &&
    after.presentScenarioKeys.length === inspected.targets.length

  return {
    afterRollback: after.counts,
    before: inspected.preview.counts,
    completedAt: now().toISOString(),
    complete: rollbackVerified,
    contractVersion: PRODUCTION_QA_HARNESS_CLEANUP_CONTRACT_VERSION,
    environment: input.plan.environment,
    rehearsalDeleted: inspected.preview.counts,
    rehearsedScenarioKeys: inspected.targets.map(
      ({ scenarioKey }) => scenarioKey
    ),
    rollbackVerified,
    runId: input.plan.runId,
    startedAt: startedAt.toISOString(),
  }
}
