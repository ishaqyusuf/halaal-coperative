import { describe, expect, test } from "bun:test"
import { createProductionQaHarnessPlan } from "@halaalvest/domain"
import {
  ensureProductionQaHarnessOverdueFixture,
  ensureProductionQaHarnessPendingReviewFixture,
  ensureProductionQaHarnessPublishedProfitFixture,
  ensureProductionQaHarnessStaleStateFixture,
} from "./production-qa-harness-fixtures"
import { ExpectedQueryError } from "../query-error"
import {
  buildProductionQaHarnessScenarioSeed,
  inspectProductionQaHarnessStateCoverage,
  previewProductionQaHarness,
} from "./production-qa-harness"

const NOW = new Date("2026-09-04T12:00:00.000Z")

function createPreviewPrisma(input?: {
  tenants?: Array<{
    cooperativeCodePrefix: string | null
    dataClassification: "live" | "qa"
    id: string
    qaSourceDomain: string | null
    slug: string
  }>
  users?: Array<{
    cooperativeAccessCode: string | null
    tenantId: string
  }>
}) {
  return {
    tenant: {
      findMany: async () => input?.tenants ?? [],
    },
    user: {
      findMany: async () => input?.users ?? [],
    },
  }
}

function createPlan() {
  return createProductionQaHarnessPlan({
    environment: "preview",
    now: NOW,
    qaDomain: "ishaq.qa.test",
    runId: "release-42",
  })
}

describe("production-contract QA harness persistence", () => {
  test("previews all stable scenario shells without writing", async () => {
    const preview = await previewProductionQaHarness(
      {
        environment: "preview",
        now: NOW,
        qaDomain: "ishaq.qa.test",
        runId: "release-42",
      },
      createPreviewPrisma() as never
    )

    expect(preview.canProvision).toBe(true)
    expect(preview.collisions).toEqual([])
    expect(preview.scenarios).toHaveLength(9)
    expect(preview.scenarios.every(({ status }) => status === "new")).toBe(true)
  })

  test("refuses live tenants and QA tenants owned by another domain", async () => {
    const scenario = createPlan().scenarios[0]!

    const live = await previewProductionQaHarness(
      {
        environment: "local",
        now: NOW,
        qaDomain: "ishaq.qa.test",
        runId: "local-check",
      },
      createPreviewPrisma({
        tenants: [
          {
            cooperativeCodePrefix: scenario.cooperativeCodePrefix,
            dataClassification: "live",
            id: "live-tenant",
            qaSourceDomain: null,
            slug: scenario.slug,
          },
        ],
      }) as never
    )
    expect(live).toMatchObject({
      canProvision: false,
      collisions: [{ category: "live_tenant_collision" }],
    })

    const wrongDomain = await previewProductionQaHarness(
      {
        environment: "development",
        now: NOW,
        qaDomain: "ishaq.qa.test",
        runId: "development-check",
      },
      createPreviewPrisma({
        tenants: [
          {
            cooperativeCodePrefix: scenario.cooperativeCodePrefix,
            dataClassification: "qa",
            id: "other-qa-tenant",
            qaSourceDomain: "other.qa.test",
            slug: scenario.slug,
          },
        ],
      }) as never
    )
    expect(wrongDomain).toMatchObject({
      canProvision: false,
      collisions: [{ category: "qa_domain_mismatch" }],
    })
  })

  test("refuses stable prefix and cooperative-number collisions", async () => {
    const scenario = createPlan().scenarios[0]!
    const preview = await previewProductionQaHarness(
      {
        environment: "preview",
        now: NOW,
        qaDomain: "ishaq.qa.test",
        runId: "collision-check",
      },
      createPreviewPrisma({
        tenants: [
          {
            cooperativeCodePrefix: scenario.cooperativeCodePrefix,
            dataClassification: "qa",
            id: "unrelated-qa-tenant",
            qaSourceDomain: "ishaq.qa.test",
            slug: "unrelated-qa-slug",
          },
        ],
        users: [
          {
            cooperativeAccessCode: scenario.identities[0]!.cooperativeNumber,
            tenantId: "unrelated-qa-tenant",
          },
        ],
      }) as never
    )

    expect(preview.canProvision).toBe(false)
    expect(
      preview.collisions.filter(
        ({ category }) => category === "identifier_collision"
      )
    ).toHaveLength(2)
  })

  test("maps capacity, KYC, blocked, and subscription states without secrets", () => {
    const plan = createPlan()
    const seeds = plan.scenarios.map((scenario) => ({
      scenario,
      seed: buildProductionQaHarnessScenarioSeed({
        now: NOW,
        qaDomain: plan.qaDomain,
        runId: plan.runId,
        scenario,
      }),
    }))

    expect(
      seeds.find(({ scenario }) => scenario.state === "at_capacity")?.seed
        .subscription.activeMemberLimitOverride
    ).toBe(1)
    expect(
      seeds.find(({ scenario }) => scenario.state === "kyc_incomplete")?.seed
        .member.kycStatus
    ).toBe("not_started")
    expect(
      seeds.find(({ scenario }) => scenario.state === "blocked")?.seed
        .subscription.status
    ).toBe("suspended")
    expect(
      seeds.find(({ scenario }) => scenario.state === "stale")?.seed.member
        .joinedAt
    ).toEqual(new Date("2026-09-01T00:00:00.000Z"))
    expect(
      seeds.find(({ scenario }) => scenario.planCode === "free_beta")?.seed
        .subscription.source
    ).toBe("free_beta")
    expect(
      seeds.every(
        ({ seed }) =>
          seed.tenantPolicy.requiresDualLoanApproval &&
          seed.tenantPolicy.reserveBufferAmount === 250_000
      )
    ).toBe(true)
    expect(JSON.stringify(seeds)).not.toMatch(
      /passwordHash|testerCredential|bearerToken/
    )
  })

  test("fails before database access in production", async () => {
    await expect(
      previewProductionQaHarness(
        {
          environment: "production",
          now: NOW,
          qaDomain: "ishaq.qa.test",
          runId: "must-fail",
        },
        createPreviewPrisma() as never
      )
    ).rejects.toThrow("available only")
  })

  test("reports missing persisted state evidence instead of trusting labels", async () => {
    const coverage = await inspectProductionQaHarnessStateCoverage(
      {
        environment: "preview",
        now: NOW,
        qaDomain: "ishaq.qa.test",
        runId: "coverage-check",
      },
      {
        tenant: { findMany: async () => [] },
      } as never
    )

    expect(coverage.complete).toBe(false)
    expect(coverage.expectedStateCount).toBe(9)
    expect(coverage.materializedStateCount).toBe(0)
    expect(coverage.scenarios.every(({ tenantId }) => tenantId === null)).toBe(
      true
    )
  })

  test("reuses an existing overdue repayment produced by the financing lifecycle", async () => {
    let userLookup = 0
    const result = await ensureProductionQaHarnessOverdueFixture({
      now: NOW,
      plan: createPlan(),
      prisma: {
        loanRequest: {
          findFirst: async () => ({
            approvals: [],
            id: "overdue-request",
            loan: {
              id: "overdue-loan",
              repaymentScheduleItems: [
                {
                  dueAt: new Date("2026-07-10T00:00:00.000Z"),
                  id: "overdue-schedule",
                  status: "overdue",
                },
              ],
              status: "active",
            },
            status: "approved",
          }),
        },
        tenant: { findFirst: async () => ({ id: "overdue-tenant" }) },
        user: {
          findUnique: async () => {
            userLookup += 1
            return userLookup === 1
              ? {
                  id: "member-user",
                  memberProfile: {
                    id: "member-profile",
                    joinedAt: new Date("2026-01-01T00:00:00.000Z"),
                  },
                }
              : { id: `staff-user-${userLookup}` }
          },
        },
      } as never,
    })

    expect(result).toEqual({
      recordId: "overdue-schedule",
      recordType: "RepaymentScheduleItem",
      scenarioKey: "growth-overdue",
      state: "overdue",
      status: "existing",
    })
  })

  test("reuses an existing pending-review product fixture", async () => {
    let createCalls = 0
    const result = await ensureProductionQaHarnessPendingReviewFixture(
      {
        now: NOW,
        plan: createPlan(),
        prisma: {
          memberPaymentReceipt: {
            findFirst: async () => ({ id: "existing-receipt" }),
          },
          tenant: { findFirst: async () => ({ id: "review-tenant" }) },
          user: {
            findUnique: async () => ({
              id: "member-user",
              memberProfile: { id: "member-profile" },
            }),
          },
        } as never,
      },
      {
        createMemberReceipt: (async () => {
          createCalls += 1
          return { id: "new-receipt" }
        }) as never,
      }
    )

    expect(result).toMatchObject({
      recordId: "existing-receipt",
      state: "pending_review",
      status: "existing",
    })
    expect(createCalls).toBe(0)
  })

  test("creates a pending review through the member receipt workflow", async () => {
    const calls: unknown[] = []
    const result = await ensureProductionQaHarnessPendingReviewFixture(
      {
        now: NOW,
        plan: createPlan(),
        prisma: {
          memberPaymentReceipt: {
            count: async () => 0,
            findFirst: async () => null,
          },
          tenant: { findFirst: async () => ({ id: "review-tenant" }) },
          user: {
            findUnique: async () => ({
              id: "member-user",
              memberProfile: { id: "member-profile" },
            }),
          },
        } as never,
      },
      {
        createMemberReceipt: (async (...args: unknown[]) => {
          calls.push(args)
          return { id: "new-receipt" }
        }) as never,
      }
    )

    expect(result).toMatchObject({
      recordId: "new-receipt",
      state: "pending_review",
      status: "provisioned",
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.[0]).toMatchObject({
      allocations: [
        {
          amount: 30_000,
          category: "special_savings",
          periodIntent: "current_period",
        },
      ],
      paymentReference: "QA-T30-STANDARD-REVIEW-01",
      tenantId: "review-tenant",
      totalAmount: 30_000,
      userId: "member-user",
    })
  })

  test("reuses an existing published-profit period", async () => {
    const result = await ensureProductionQaHarnessPublishedProfitFixture({
      now: NOW,
      plan: createPlan(),
      prisma: {
        shareBusiness: {
          findFirst: async () => ({
            id: "fixture-business",
            profitEntries: [
              {
                linkedDividendPeriod: {
                  id: "published-period",
                  status: "published",
                },
              },
            ],
          }),
        },
        tenant: { findFirst: async () => ({ id: "profit-tenant" }) },
      } as never,
    })

    expect(result).toEqual({
      recordId: "published-period",
      recordType: "DividendPeriod",
      scenarioKey: "enterprise-profit",
      state: "published_profit",
      status: "existing",
    })
  })

  test("reuses a verified stale-state rejection observation", async () => {
    let updateCalls = 0
    const result = await ensureProductionQaHarnessStaleStateFixture(
      {
        now: NOW,
        plan: createPlan(),
        prisma: {
          auditLog: {
            findUnique: async () => ({
              action:
                "qa.production_contract.operation_profile.stale_state_rejected",
              entityId: "procurement-setting",
              id: "612e318b-b529-49fc-9973-89efff5fb401",
              tenantId: "stale-tenant",
            }),
          },
          tenant: { findFirst: async () => ({ id: "stale-tenant" }) },
          tenantServiceSetting: {
            findUnique: async () => ({
              accessMode: "read_only",
              id: "procurement-setting",
            }),
          },
          user: { findUnique: async () => ({ id: "admin-user" }) },
        } as never,
      },
      {
        updateService: (async () => {
          updateCalls += 1
          throw new Error("must not execute")
        }) as never,
      }
    )

    expect(result).toMatchObject({
      recordId: "procurement-setting",
      state: "stale",
      status: "existing",
    })
    expect(updateCalls).toBe(0)
  })

  test("records a real stale compare-and-set rejection without changing state", async () => {
    const auditEntries: unknown[] = []
    let updateCalls = 0
    const setting = {
      accessMode: "read_only",
      id: "procurement-setting",
    }
    const prisma = {
      $transaction: async (callback: (transaction: unknown) => unknown) =>
        callback(prisma),
      auditLog: {
        create: async (entry: unknown) => {
          auditEntries.push(entry)
          return entry
        },
        findUnique: async () => null,
      },
      tenant: { findFirst: async () => ({ id: "stale-tenant" }) },
      tenantServiceSetting: { findUnique: async () => setting },
      user: { findUnique: async () => ({ id: "admin-user" }) },
    }

    const result = await ensureProductionQaHarnessStaleStateFixture(
      { now: NOW, plan: createPlan(), prisma: prisma as never },
      {
        updateService: (async () => {
          updateCalls += 1
          throw ExpectedQueryError.conflict(
            "This service access mode changed on another device."
          )
        }) as never,
      }
    )

    expect(result).toMatchObject({ state: "stale", status: "provisioned" })
    expect(updateCalls).toBe(1)
    expect(setting.accessMode).toBe("read_only")
    expect(auditEntries).toHaveLength(1)
    expect(auditEntries[0]).toMatchObject({
      data: {
        action: "qa.production_contract.operation_profile.stale_state_rejected",
        entityId: "procurement-setting",
        metadata: { status: "rejected" },
        tenantId: "stale-tenant",
      },
    })
  })
})
