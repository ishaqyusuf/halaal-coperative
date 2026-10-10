import { describe, expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import {
  createProductionQaHarnessPlan,
  PRODUCTION_QA_HARNESS_CLEANUP_CONFIRMATION,
  PRODUCTION_QA_HARNESS_CLEANUP_REHEARSAL_CONFIRMATION,
  type ProductionQaHarnessPlan,
} from "@halaalvest/domain"
import {
  previewProductionQaHarnessCleanup,
  purgeProductionQaHarness,
  rehearseProductionQaHarnessCleanup,
} from "./production-qa-harness-cleanup"

const NOW = new Date("2026-09-04T20:00:00.000Z")

function createPlan() {
  return createProductionQaHarnessPlan({
    environment: "preview",
    now: NOW,
    qaDomain: "ishaq.qa.test",
    runId: "cleanup-rehearsal",
  })
}

function createCleanupPrisma(
  plan: ProductionQaHarnessPlan,
  options: {
    customDomainIndex?: number
    providerAddonIndex?: number
    providerIndex?: number
    safeRevokedSessionIndex?: number
    staleOnUpdate?: boolean
    unsafeSessionIndex?: number
    unsafeUserIndex?: number
    wrongClassificationIndex?: number
    wrongDomainIndex?: number
  } = {}
) {
  const tenants = plan.scenarios.map((scenario, index) => ({
    _count: {
      domains: options.customDomainIndex === index ? 1 : 0,
      memberDocuments: 0,
      subscriptionCheckoutIntents: 0,
      subscriptionInvoices: 0,
      subscriptionProviderEvents: 0,
    },
    cooperativeCodePrefix: scenario.cooperativeCodePrefix,
    dataClassification:
      options.wrongClassificationIndex === index
        ? ("live" as const)
        : ("qa" as const),
    id: `tenant-${index}`,
    name: scenario.name,
    qaPurgeStartedAt: null as Date | null,
    qaSourceDomain:
      options.wrongDomainIndex === index ? "other.qa.test" : plan.qaDomain,
    slug: scenario.slug,
    subscription: {
      addons:
        options.providerAddonIndex === index
          ? [{ providerAddonId: "provider-addon" }]
          : [],
      providerCustomerId:
        options.providerIndex === index ? "provider-customer" : null,
      providerName: options.providerIndex === index ? "provider" : null,
      providerSubscriptionId: null,
    },
    updatedAt: new Date(NOW.getTime() + index),
  }))
  const deletedIds: string[] = []
  const count = (value: number) => async () => (tenants.length > 0 ? value : 0)
  const prisma = {
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      const snapshot = tenants.map((tenant) => ({
        ...tenant,
        _count: { ...tenant._count },
        subscription: {
          ...tenant.subscription,
          addons: [...tenant.subscription.addons],
        },
      }))
      const deletedCount = deletedIds.length
      try {
        return await callback(prisma)
      } catch (error) {
        tenants.splice(0, tenants.length, ...snapshot)
        deletedIds.splice(deletedCount)
        throw error
      }
    },
    auditLog: { count: count(24) },
    ledgerTransaction: { count: count(4) },
    member: { count: count(10) },
    memberDocument: { count: count(0) },
    mobileDeviceSession: {
      findMany: async () => [
        ...(options.safeRevokedSessionIndex === undefined
          ? []
          : [
              {
                appVersion: "ticket-30-proof",
                buildVariant: "local-qa",
                deviceLabel: "Ticket 30 headless Android proof",
                platform: "android",
                revokedAt: NOW,
                tenantId: `tenant-${options.safeRevokedSessionIndex}`,
              },
            ]),
        ...(options.unsafeSessionIndex === undefined
          ? []
          : [
              {
                appVersion: "production",
                buildVariant: "production",
                deviceLabel: "Personal phone",
                platform: "android",
                revokedAt: null,
                tenantId: `tenant-${options.unsafeSessionIndex}`,
              },
            ]),
      ],
    },
    tenant: {
      count: async () => tenants.length,
      delete: async ({ where }: { where: { id: string } }) => {
        const index = tenants.findIndex((tenant) => tenant.id === where.id)
        if (index < 0) throw new Error("missing tenant")
        const [deleted] = tenants.splice(index, 1)
        deletedIds.push(deleted!.id)
        return { id: deleted!.id }
      },
      findMany: async () => tenants,
      updateMany: async ({
        data,
        where,
      }: {
        data: { qaPurgeStartedAt: Date }
        where: { id: string }
      }) => {
        if (options.staleOnUpdate) return { count: 0 }
        const tenant = tenants.find((candidate) => candidate.id === where.id)
        if (!tenant) return { count: 0 }
        tenant.qaPurgeStartedAt = data.qaPurgeStartedAt
        return { count: 1 }
      },
    },
    user: {
      count: count(36),
      findMany: async () =>
        options.unsafeUserIndex === undefined
          ? []
          : [{ tenantId: `tenant-${options.unsafeUserIndex}` }],
    },
  }

  return {
    deletedIds,
    prisma: prisma as unknown as PrismaClient,
    tenants,
  }
}

describe("production-contract QA harness cleanup", () => {
  test("previews only exact visibly classified harness tenants", async () => {
    const plan = createPlan()
    const fixture = createCleanupPrisma(plan)
    const preview = await previewProductionQaHarnessCleanup(
      plan,
      fixture.prisma
    )

    expect(preview.canPurge).toBe(true)
    expect(preview.blockers).toEqual([])
    expect(preview.presentScenarioKeys).toHaveLength(9)
    expect(preview.counts).toEqual({
      auditLogs: 24,
      ledgerTransactions: 4,
      memberDocuments: 0,
      members: 10,
      users: 36,
      workspaces: 9,
    })
    expect(preview.fingerprint).toHaveLength(64)
  })

  test("fails closed on live, foreign-domain, provider, domain, or credential evidence", async () => {
    const plan = createPlan()
    const fixture = createCleanupPrisma(plan, {
      customDomainIndex: 3,
      providerIndex: 2,
      unsafeUserIndex: 4,
      wrongClassificationIndex: 0,
      wrongDomainIndex: 1,
    })
    const preview = await previewProductionQaHarnessCleanup(
      plan,
      fixture.prisma
    )

    expect(preview.canPurge).toBe(false)
    expect(new Set(preview.blockers.map(({ category }) => category))).toEqual(
      new Set([
        "credential_or_session",
        "custom_domain",
        "live_classification",
        "provider_resource",
        "qa_domain_mismatch",
      ])
    )
    expect(fixture.deletedIds).toEqual([])
  })

  test("treats provider-linked subscription add-ons as external resources", async () => {
    const plan = createPlan()
    const fixture = createCleanupPrisma(plan, { providerAddonIndex: 1 })
    const preview = await previewProductionQaHarnessCleanup(
      plan,
      fixture.prisma
    )

    expect(preview.canPurge).toBe(false)
    expect(preview.blockers).toContainEqual({
      category: "provider_resource",
      scenarioKey: plan.scenarios[1]!.key,
    })
    expect(fixture.deletedIds).toEqual([])
  })

  test("allows exact revoked harness sessions but blocks active or foreign sessions", async () => {
    const plan = createPlan()
    const safeFixture = createCleanupPrisma(plan, {
      safeRevokedSessionIndex: 1,
    })
    const safePreview = await previewProductionQaHarnessCleanup(
      plan,
      safeFixture.prisma
    )
    expect(safePreview.canPurge).toBe(true)
    expect(safePreview.blockers).toEqual([])

    const unsafeFixture = createCleanupPrisma(plan, {
      unsafeSessionIndex: 1,
    })
    const unsafePreview = await previewProductionQaHarnessCleanup(
      plan,
      unsafeFixture.prisma
    )
    expect(unsafePreview.canPurge).toBe(false)
    expect(unsafePreview.blockers).toContainEqual({
      category: "credential_or_session",
      scenarioKey: plan.scenarios[1]!.key,
    })
  })

  test("requires exact confirmation and an unchanged preview fingerprint", async () => {
    const plan = createPlan()
    const fixture = createCleanupPrisma(plan)
    const preview = await previewProductionQaHarnessCleanup(
      plan,
      fixture.prisma
    )

    await expect(
      purgeProductionQaHarness({
        confirmation: "PURGE",
        expectedFingerprint: preview.fingerprint,
        plan,
        prismaOverride: fixture.prisma,
      })
    ).rejects.toThrow("confirmation did not match")
    await expect(
      purgeProductionQaHarness({
        confirmation: PRODUCTION_QA_HARNESS_CLEANUP_CONFIRMATION,
        expectedFingerprint: "stale-fingerprint",
        plan,
        prismaOverride: fixture.prisma,
      })
    ).rejects.toThrow("preview changed")
    expect(fixture.deletedIds).toEqual([])
  })

  test("atomically deletes the exact target set and returns counts-only evidence", async () => {
    const plan = createPlan()
    const fixture = createCleanupPrisma(plan)
    const preview = await previewProductionQaHarnessCleanup(
      plan,
      fixture.prisma
    )
    const receipt = await purgeProductionQaHarness({
      confirmation: PRODUCTION_QA_HARNESS_CLEANUP_CONFIRMATION,
      expectedFingerprint: preview.fingerprint,
      now: () => NOW,
      plan,
      prismaOverride: fixture.prisma,
    })

    expect(receipt.complete).toBe(true)
    expect(receipt.deletedScenarioKeys).toHaveLength(9)
    expect(receipt.deleted.workspaces).toBe(9)
    expect(receipt.after.workspaces).toBe(0)
    expect(fixture.deletedIds).toHaveLength(9)
    expect(JSON.stringify(receipt)).not.toContain("tenant-")
    expect(JSON.stringify(receipt)).not.toContain("@ishaq.qa.test")
  })

  test("executes the exact deletion inside a transaction and verifies rollback", async () => {
    const plan = createPlan()
    const fixture = createCleanupPrisma(plan)
    const preview = await previewProductionQaHarnessCleanup(
      plan,
      fixture.prisma
    )
    const receipt = await rehearseProductionQaHarnessCleanup({
      confirmation: PRODUCTION_QA_HARNESS_CLEANUP_REHEARSAL_CONFIRMATION,
      expectedFingerprint: preview.fingerprint,
      now: () => NOW,
      plan,
      prismaOverride: fixture.prisma,
    })

    expect(receipt.complete).toBe(true)
    expect(receipt.rollbackVerified).toBe(true)
    expect(receipt.rehearsedScenarioKeys).toHaveLength(9)
    expect(receipt.rehearsalDeleted.workspaces).toBe(9)
    expect(receipt.afterRollback).toEqual(receipt.before)
    expect(fixture.tenants).toHaveLength(9)
    expect(fixture.deletedIds).toEqual([])
  })

  test("aborts before deletion when a target changes after preview", async () => {
    const plan = createPlan()
    const fixture = createCleanupPrisma(plan, { staleOnUpdate: true })
    const preview = await previewProductionQaHarnessCleanup(
      plan,
      fixture.prisma
    )

    await expect(
      purgeProductionQaHarness({
        confirmation: PRODUCTION_QA_HARNESS_CLEANUP_CONFIRMATION,
        expectedFingerprint: preview.fingerprint,
        plan,
        prismaOverride: fixture.prisma,
      })
    ).rejects.toThrow("target changed")
    expect(fixture.deletedIds).toEqual([])
  })

  test("rejects a forged production plan before database access", async () => {
    let reads = 0
    const plan = {
      ...createPlan(),
      environment: "production",
    } as unknown as ProductionQaHarnessPlan
    const fixture = createCleanupPrisma(createPlan())
    fixture.prisma.tenant.findMany = async () => {
      reads += 1
      return [] as never
    }

    await expect(
      previewProductionQaHarnessCleanup(plan, fixture.prisma)
    ).rejects.toThrow("unavailable in production")
    expect(reads).toBe(0)
  })
})
