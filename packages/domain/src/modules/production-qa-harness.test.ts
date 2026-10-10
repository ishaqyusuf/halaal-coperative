import { describe, expect, test } from "bun:test"
import {
  assertProductionQaHarnessPlan,
  createProductionQaHarnessEvidenceReport,
  createProductionQaHarnessPlan,
  evaluateProductionQaHarnessStateMaterialization,
  PRODUCTION_QA_HARNESS_PRODUCT_AREAS,
  PRODUCTION_QA_HARNESS_ROLES,
  PRODUCTION_QA_HARNESS_STATES,
} from "./production-qa-harness"
import { SUBSCRIPTION_PLAN_CODES } from "./subscriptions"

const NOW = new Date("2026-09-04T12:00:00.000Z")

function createPlan() {
  return createProductionQaHarnessPlan({
    environment: "preview",
    now: NOW,
    qaDomain: "@Ishaq.QA.Test.",
    runId: "release-42",
  })
}

describe("production-contract QA harness plan", () => {
  test("builds a deterministic exact-domain plan with complete coverage", () => {
    const plan = createPlan()

    expect(plan).toEqual(createPlan())
    expect(plan.qaDomain).toBe("ishaq.qa.test")
    expect(plan.scenarios).toHaveLength(PRODUCTION_QA_HARNESS_STATES.length)
    expect(new Set(plan.scenarios.map(({ planCode }) => planCode))).toEqual(
      new Set(SUBSCRIPTION_PLAN_CODES)
    )
    expect(new Set(plan.scenarios.map(({ state }) => state))).toEqual(
      new Set(PRODUCTION_QA_HARNESS_STATES)
    )
    expect(
      new Set(plan.scenarios.flatMap(({ productAreas }) => productAreas))
    ).toEqual(new Set(PRODUCTION_QA_HARNESS_PRODUCT_AREAS))

    for (const scenario of plan.scenarios) {
      expect(scenario.name).toStartWith("QA ONLY — ")
      expect(new Set(scenario.identities.map(({ role }) => role))).toEqual(
        new Set(PRODUCTION_QA_HARNESS_ROLES)
      )
      expect(
        scenario.identities.every(({ email }) =>
          email.endsWith("@ishaq.qa.test")
        )
      ).toBe(true)
      expect(
        scenario.identities.every(({ cooperativeNumber }) =>
          /^[A-Z]{3,5}-\d{4}$/.test(cooperativeNumber)
        )
      ).toBe(true)
    }

    const roleSwitchIdentity = plan.scenarios
      .find(({ key }) => key === "starter-healthy")
      ?.identities.find(({ role }) => role === "tenant_admin")
    expect(roleSwitchIdentity).toMatchObject({
      memberNumber: "QSH-0002",
      secondaryRoles: ["member"],
    })
    expect(
      plan.scenarios.find(({ key }) => key === "starter-healthy")
        ?.activeAddonCodes
    ).toEqual(["member_login"])
    expect(
      plan.scenarios
        .filter(({ key }) => key !== "starter-healthy")
        .every(({ activeAddonCodes }) => activeAddonCodes.length === 0)
    ).toBe(true)
  })

  test("reserves explicit capacity, KYC, blocked, and profit scenarios", () => {
    const plan = createPlan()

    expect(
      plan.scenarios.find(({ state }) => state === "at_capacity")
    ).toMatchObject({ planCode: "starter" })
    expect(
      plan.scenarios.find(({ state }) => state === "kyc_incomplete")
    ).toMatchObject({ operationProfile: "member_self_service" })
    expect(
      plan.scenarios.find(({ state }) => state === "blocked")
    ).toMatchObject({ operationProfile: "restricted" })
    expect(
      plan.scenarios.find(({ state }) => state === "published_profit")
    ).toMatchObject({ planCode: "enterprise" })
  })

  test("rejects duplicate or plan-ineligible active add-ons before persistence", () => {
    const duplicatePlan = createPlan()
    duplicatePlan.scenarios[1]!.activeAddonCodes = [
      "member_login",
      "member_login",
    ]
    expect(() => assertProductionQaHarnessPlan(duplicatePlan)).toThrow(
      "duplicate active add-ons"
    )

    const unavailablePlan = createPlan()
    unavailablePlan.scenarios[0]!.activeAddonCodes = ["member_login"]
    expect(() => assertProductionQaHarnessPlan(unavailablePlan)).toThrow(
      "outside plan free_beta"
    )
  })

  test("requires persisted evidence instead of trusting scenario labels", () => {
    const baseFacts = {
      activeMemberCount: 1,
      activeMemberLimit: null,
      hasKycIncompleteMember: false,
      hasOverdueSchedule: false,
      hasPendingReview: false,
      hasPublishedProfit: false,
      hasStaleRecord: false,
      hasVerifiedActiveMember: true,
      productRecordCount: 1,
      subscriptionStatus: "active",
      tenantStatus: "active",
    }
    const factsByState = {
      at_capacity: { ...baseFacts, activeMemberLimit: 1 },
      blocked: { ...baseFacts, subscriptionStatus: "suspended" },
      empty: { ...baseFacts, productRecordCount: 0 },
      healthy: baseFacts,
      kyc_incomplete: {
        ...baseFacts,
        hasKycIncompleteMember: true,
      },
      overdue: { ...baseFacts, hasOverdueSchedule: true },
      pending_review: { ...baseFacts, hasPendingReview: true },
      published_profit: { ...baseFacts, hasPublishedProfit: true },
      stale: { ...baseFacts, hasStaleRecord: true },
    } as const

    for (const state of PRODUCTION_QA_HARNESS_STATES) {
      expect(
        evaluateProductionQaHarnessStateMaterialization({
          facts: factsByState[state],
          state,
        })
      ).toMatchObject({ materialized: true, state })
      expect(
        evaluateProductionQaHarnessStateMaterialization({
          facts: {
            ...baseFacts,
            hasVerifiedActiveMember: false,
            productRecordCount: 2,
            subscriptionStatus: null,
            tenantStatus: null,
          },
          state,
        }).materialized
      ).toBe(false)
    }
  })

  test("fails closed outside governed non-production environments", () => {
    for (const environment of ["production", "test", "unknown"]) {
      expect(() =>
        createProductionQaHarnessPlan({
          environment,
          now: NOW,
          qaDomain: "ishaq.qa.test",
          runId: "release-42",
        })
      ).toThrow("available only")
    }
  })

  test("rejects non-test domains, unsafe run ids, and incomplete plans", () => {
    expect(() =>
      createProductionQaHarnessPlan({
        environment: "preview",
        now: NOW,
        qaDomain: "example.com",
        runId: "release-42",
      })
    ).toThrow(".test QA Domain")
    expect(() =>
      createProductionQaHarnessPlan({
        environment: "preview",
        now: NOW,
        qaDomain: "ishaq.qa.test",
        runId: "Release 42!",
      })
    ).toThrow("run id")

    const plan = createPlan()
    plan.scenarios = plan.scenarios.filter(
      ({ state }) => state !== "published_profit"
    )
    expect(() => assertProductionQaHarnessPlan(plan)).toThrow(
      "published_profit"
    )
  })

  test("creates a bounded human-readable report without identities or secrets", () => {
    const plan = createPlan()
    const report = createProductionQaHarnessEvidenceReport({
      generatedAt: NOW,
      plan,
      results: plan.scenarios.map((scenario, index) => ({
        errorCode: index === 0 ? "provision_failed" : undefined,
        scenarioKey: scenario.key,
        status: index === 0 ? ("failed" as const) : ("planned" as const),
      })),
    })

    expect(report).toContain("# Production-contract QA harness evidence")
    expect(report).toContain("8 planned")
    expect(report).toContain("1 failed")
    expect(report).toContain("published_profit")
    expect(report).toContain("Remaining acceptance gaps")
    expect(report).not.toContain("qa-standard-review-member")
    expect(report).not.toContain("QSR-MEM")
    expect(report).toContain(
      "No password, OTP, tester credential, bearer token, provider credential, or raw production data"
    )
  })
})
