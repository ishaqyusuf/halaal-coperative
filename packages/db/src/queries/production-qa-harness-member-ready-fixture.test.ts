import { describe, expect, test } from "bun:test"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import { buildProductionQaHarnessScenarioSeed } from "./production-qa-harness"
import {
  ensureProductionQaHarnessMemberReadyFixture,
  PRODUCTION_QA_MEMBER_READY_FIXTURE,
} from "./production-qa-harness-member-ready-fixture"

const NOW = new Date("2026-11-15T12:00:00.000Z")
const TENANT_ID = "tenant-ready"

function createPlan() {
  return createProductionQaHarnessPlan({
    environment: "local",
    now: NOW,
    qaDomain: "ishaq.qa.test",
    runId: "member-ready",
  })
}

function createFakePrisma(state: {
  appliedOpeningBalance?: boolean
  foodCycleStatus?: "open" | "closed" | null
  ledgerSavings?: number
  snapshot?: number
  pendingCharge?: boolean
  stagedOpeningBalance?: "pending_review" | "approved" | null
  tenant?: boolean
}) {
  const plan = createPlan()
  const scenario = plan.scenarios.find(({ key }) => key === "standard-ready")!
  const email = (role: string) =>
    scenario.identities.find((identity) => identity.role === role)!.email
  const calls = {
    applicability: [] as Array<{ trigger: string; workflow: string }>,
    definitions: [] as string[],
    snapshotUpdates: [] as number[],
    tenantWhere: undefined as unknown,
  }
  const prisma = {
    chargeApplicability: {
      upsert: async ({ create }: any) => {
        calls.applicability.push({
          trigger: create.trigger,
          workflow: create.workflow,
        })
        return { id: `rule-${calls.applicability.length}` }
      },
    },
    chargeApplication: {
      findFirst: async () =>
        state.pendingCharge ? { id: "pending-charge" } : null,
    },
    chargeDefinition: {
      upsert: async ({ create }: any) => {
        calls.definitions.push(create.code)
        return { id: `definition-${create.code}` }
      },
    },
    chargeDefinitionVersion: { upsert: async () => ({ id: "version" }) },
    ledgerEntry: {
      groupBy: async () => [
        {
          _sum: { amount: state.ledgerSavings ?? 250_000 },
          direction: "credit",
        },
      ],
    },
    member: {
      findFirst: async () => ({
        totalSavingsSnapshot: state.snapshot ?? 250_000,
      }),
      update: async ({ data }: any) => {
        calls.snapshotUpdates.push(Number(data.totalSavingsSnapshot))
        return {}
      },
    },
    foodPurchaseCycle: {
      findFirst: async () =>
        state.foodCycleStatus ? { status: state.foodCycleStatus } : null,
    },
    memberOpeningBalance: {
      findFirst: async ({ where }: any) => {
        if (where.status === "applied")
          return state.appliedOpeningBalance ? { id: "applied" } : null
        return state.stagedOpeningBalance
          ? { id: "staged", status: state.stagedOpeningBalance }
          : null
      },
    },
    tenant: {
      findFirst: async ({ where }: any) => {
        calls.tenantWhere = where
        return state.tenant === false ? null : { id: TENANT_ID }
      },
    },
    user: {
      findMany: async () => [
        { email: email("tenant_admin"), id: "admin", memberProfile: null },
        { email: email("finance_officer"), id: "finance", memberProfile: null },
        {
          email: email("member"),
          id: "member-user",
          memberProfile: { id: "member" },
        },
      ],
    },
  }
  return { calls, plan, prisma }
}

function createDependencies() {
  const log: string[] = []
  return {
    dependencies: {
      applyCharge: (async (input: any) => {
        log.push(`applyCharge:${input.collectionMode}:${input.actorUserId}`)
        return { id: "new-charge" }
      }) as never,
      applyMemberOpeningBalance: (async (input: any) => {
        log.push(`apply:${input.openingBalanceId}:${input.actorUserId}`)
        return {}
      }) as never,
      createFoodPurchaseCycle: (async (input: any) => {
        log.push(`foodCycle:${input.periodMonth.toISOString().slice(0, 10)}`)
        return {}
      }) as never,
      createMemberOpeningBalance: (async (input: any) => {
        log.push(
          `create:${input.commitmentSavingsBalance}:${input.actorUserId}`
        )
        return { id: "created" }
      }) as never,
      ensureTenantLedgerAccounts: (async () => ({})) as never,
      getMemberOperationalReadiness: (async () => ({ isReady: true })) as never,
      reviewMemberOpeningBalance: (async (input: any) => {
        log.push(
          `review:${input.openingBalanceId}:${input.decision}:${input.actorUserId}`
        )
        return {}
      }) as never,
    },
    log,
  }
}

describe("member-ready QA harness fixture", () => {
  test("seeds brought-forward migration and an empty savings snapshot", () => {
    const plan = createPlan()
    const ready = plan.scenarios.find(({ key }) => key === "standard-ready")!
    const review = plan.scenarios.find(({ key }) => key === "standard-review")!
    const seed = (scenario: typeof ready) =>
      buildProductionQaHarnessScenarioSeed({
        now: NOW,
        qaDomain: plan.qaDomain,
        runId: plan.runId,
        scenario,
      })

    expect(seed(ready).tenantPolicy.migrationSetupMode).toBe("brought_forward")
    expect(seed(ready).member).toMatchObject({
      kycStatus: "verified",
      totalSavingsSnapshot: 0,
    })
    expect(seed(ready).migration).toEqual({
      initialMigrationStatus: "live_operations",
    })
    expect("migrationSetupMode" in seed(review).tenantPolicy).toBe(false)
  })

  test("provisions through the staff write paths on a fresh QA tenant", async () => {
    const { calls, plan, prisma } = createFakePrisma({ foodCycleStatus: null })
    const { dependencies, log } = createDependencies()

    const result = await ensureProductionQaHarnessMemberReadyFixture(
      { now: NOW, plan, prisma: prisma as never },
      dependencies
    )

    expect(calls.tenantWhere).toEqual({
      dataClassification: "qa",
      qaSourceDomain: "ishaq.qa.test",
      slug: "qa-harness-v1-standard-ready",
    })
    expect(log).toEqual([
      `create:${PRODUCTION_QA_MEMBER_READY_FIXTURE.openingCommitmentSavings}:finance`,
      "review:created:approved:admin",
      "apply:created:admin",
      "applyCharge:pay_separately:finance",
      "foodCycle:2026-11-01",
    ])
    expect(calls.definitions).toEqual([
      "QA-REQUEST-FORM-FEE",
      "QA-REQUEST-APPROVAL-FEE",
      "QA-PASSBOOK-FEE",
    ])
    for (const workflow of PRODUCTION_QA_MEMBER_READY_FIXTURE.workflows)
      for (const trigger of ["submission", "approval"])
        expect(calls.applicability).toContainEqual({ trigger, workflow })
    expect(result).toMatchObject({
      foodCycle: "provisioned",
      memberReady: true,
      openingBalance: "provisioned",
      pendingChargeApplicationId: "new-charge",
      separateCharge: "provisioned",
      state: "member_ready",
      status: "provisioned",
      workflowChargeRuleCount: 6,
    })
  })

  test("is idempotent: a re-run reuses the applied balance, charge and month", async () => {
    const { plan, prisma } = createFakePrisma({
      appliedOpeningBalance: true,
      foodCycleStatus: "open",
      pendingCharge: true,
    })
    const { dependencies, log } = createDependencies()

    const result = await ensureProductionQaHarnessMemberReadyFixture(
      { now: NOW, plan, prisma: prisma as never },
      dependencies
    )

    expect(log).toEqual([])
    expect(result).toMatchObject({
      foodCycle: "existing",
      openingBalance: "existing",
      pendingChargeApplicationId: "pending-charge",
      separateCharge: "existing",
      status: "existing",
    })
  })

  test("finishes a staged balance and replaces a settled charge", async () => {
    const { plan, prisma } = createFakePrisma({
      foodCycleStatus: "closed",
      stagedOpeningBalance: "approved",
    })
    const { dependencies, log } = createDependencies()

    const result = await ensureProductionQaHarnessMemberReadyFixture(
      { now: NOW, plan, prisma: prisma as never },
      dependencies
    )

    expect(log).toEqual([
      "apply:staged:admin",
      "applyCharge:pay_separately:finance",
    ])
    expect(result.foodCycle).toBe("not_open")
  })

  test("realigns a drifted savings snapshot with the savings ledger", async () => {
    const drifted = createFakePrisma({
      appliedOpeningBalance: true,
      foodCycleStatus: "open",
      ledgerSavings: 250_000,
      pendingCharge: true,
      snapshot: 0,
    })
    const { dependencies } = createDependencies()
    const result = await ensureProductionQaHarnessMemberReadyFixture(
      { now: NOW, plan: drifted.plan, prisma: drifted.prisma as never },
      dependencies
    )
    expect(drifted.calls.snapshotUpdates).toEqual([250_000])
    expect(result.savingsSnapshotAligned).toBe(true)

    const aligned = createFakePrisma({
      appliedOpeningBalance: true,
      foodCycleStatus: "open",
      pendingCharge: true,
    })
    const again = await ensureProductionQaHarnessMemberReadyFixture(
      { now: NOW, plan: aligned.plan, prisma: aligned.prisma as never },
      dependencies
    )
    expect(aligned.calls.snapshotUpdates).toEqual([])
    expect(again.savingsSnapshotAligned).toBe(false)
  })

  test("refuses when the QA tenant is missing", async () => {
    const { plan, prisma } = createFakePrisma({ tenant: false })
    const { dependencies } = createDependencies()

    await expect(
      ensureProductionQaHarnessMemberReadyFixture(
        { now: NOW, plan, prisma: prisma as never },
        dependencies
      )
    ).rejects.toThrow("tenant is missing")
  })
})
