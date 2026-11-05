import { describe, expect, test } from "bun:test"
import {
  buildOnePathRailSteps,
  getJourneyStepKey,
  getNextGettingStartedStep,
  getOrderedGettingStartedStepKeys,
  getPreviousGettingStartedStep,
  isGettingStartedStepComplete,
  isSetupStepConfirmed,
  resolveGettingStartedResumeStep,
  resolveLegacyGettingStartedStep,
  type GettingStartedProgressInput,
} from "./getting-started-step-model"

function progress(
  overrides: Partial<GettingStartedProgressInput> = {}
): GettingStartedProgressInput {
  return {
    businessPolicyId: null,
    businessProfitSeasons: [],
    migrationSetup: { confirmedAt: null, mode: "brought_forward" },
    operationProfileReviewedAt: null,
    sharePolicy: { confirmedAt: null },
    snapshot: {
      canUseLiveFinancialWrites: false,
      missingStepKeys: [
        "charge_schedules",
        "member_profiles",
        "member_ledger_backfill",
        "finalization",
      ],
      status: "historical_setup_in_progress",
    },
    ...overrides,
  }
}

describe("One Path Getting Started step model", () => {
  test("a freshly signed-up tenant has nothing done and resumes at step 5", () => {
    const input = progress()

    // Schema defaults and the sign-up TenantPolicy row are not a save.
    expect(isGettingStartedStepComplete("setup-mode", input)).toBe(false)
    expect(isGettingStartedStepComplete("shares-charges", input)).toBe(false)
    expect(isGettingStartedStepComplete("profit", input)).toBe(false)
    expect(resolveGettingStartedResumeStep(input)).toBe("setup-mode")
  })

  test("untouched shares and profit are not done", () => {
    const input = progress({
      migrationSetup: {
        confirmedAt: "2026-11-05T10:00:00.000Z",
        mode: "brought_forward",
      },
      snapshot: {
        canUseLiveFinancialWrites: false,
        missingStepKeys: ["charge_schedules", "finalization"],
        status: "historical_setup_in_progress",
      },
    })

    expect(isGettingStartedStepComplete("setup-mode", input)).toBe(true)
    expect(isGettingStartedStepComplete("shares-charges", input)).toBe(false)
    expect(isGettingStartedStepComplete("profit", input)).toBe(false)
    expect(resolveGettingStartedResumeStep(input)).toBe("operation-profile")
  })

  test("step 7 needs both the share policy save and a saved charge", () => {
    const base = {
      migrationSetup: {
        confirmedAt: "2026-11-05T10:00:00.000Z",
        mode: "brought_forward" as const,
      },
      operationProfileReviewedAt: null,
    }

    expect(
      isGettingStartedStepComplete(
        "shares-charges",
        progress({
          ...base,
          sharePolicy: { confirmedAt: "2026-11-05T10:05:00.000Z" },
        })
      )
    ).toBe(false)
    expect(
      isGettingStartedStepComplete(
        "shares-charges",
        progress({
          ...base,
          sharePolicy: { confirmedAt: "2026-11-05T10:05:00.000Z" },
          snapshot: {
            canUseLiveFinancialWrites: false,
            missingStepKeys: ["finalization"],
            status: "historical_setup_in_progress",
          },
        })
      )
    ).toBe(true)
  })

  test("step 5 for a legacy tenant without a start date is not done", () => {
    const input = progress({
      migrationSetup: {
        confirmedAt: "2026-11-05T10:00:00.000Z",
        mode: "historical_backfill",
      },
      snapshot: {
        canUseLiveFinancialWrites: false,
        missingStepKeys: ["finance_start_date", "finalization"],
        status: "not_started",
      },
    })

    expect(isGettingStartedStepComplete("setup-mode", input)).toBe(false)
  })

  test("step 8 needs a profit policy and the mode's business rule", () => {
    const historical = progress({
      businessPolicyId: "policy-1",
      migrationSetup: {
        confirmedAt: "2026-11-05T10:00:00.000Z",
        mode: "historical_backfill",
      },
      snapshot: {
        canUseLiveFinancialWrites: false,
        missingStepKeys: ["business_profit_pools", "finalization"],
        status: "historical_setup_in_progress",
      },
    })

    expect(isGettingStartedStepComplete("profit", historical)).toBe(false)
    expect(
      isGettingStartedStepComplete("profit", {
        ...historical,
        migrationSetup: { confirmedAt: "x", mode: "brought_forward" },
      })
    ).toBe(true)
  })

  test("the confirmation fallback only trusts real progress", () => {
    expect(
      isSetupStepConfirmed({
        confirmedAt: null,
        operationProfileReviewed: false,
        status: "historical_setup_in_progress",
      })
    ).toBe(false)
    expect(
      isSetupStepConfirmed({
        confirmedAt: "2026-11-05T10:00:00.000Z",
        operationProfileReviewed: false,
        status: "not_started",
      })
    ).toBe(true)
    expect(
      isSetupStepConfirmed({
        confirmedAt: null,
        operationProfileReviewed: true,
        status: "historical_setup_in_progress",
      })
    ).toBe(true)
    for (const status of [
      "member_migration_in_progress",
      "migration_review",
      "finalized",
      "live_operations",
    ] as const) {
      expect(
        isSetupStepConfirmed({
          confirmedAt: null,
          operationProfileReviewed: false,
          status,
        })
      ).toBe(true)
    }
  })

  test("resume order follows the journey map", () => {
    const setupDone = progress({
      businessPolicyId: "policy-1",
      migrationSetup: { confirmedAt: "a", mode: "brought_forward" },
      operationProfileReviewedAt: "2026-11-05T10:00:00.000Z",
      sharePolicy: { confirmedAt: "b" },
      snapshot: {
        canUseLiveFinancialWrites: false,
        missingStepKeys: ["member_ledger_backfill", "finalization"],
        status: "member_migration_in_progress",
      },
    })

    expect(resolveGettingStartedResumeStep(setupDone)).toBe("admin-member")
    expect(
      resolveGettingStartedResumeStep({
        ...setupDone,
        snapshot: {
          canUseLiveFinancialWrites: false,
          missingStepKeys: ["finalization"],
          status: "migration_review",
        },
      })
    ).toBe("review")
    expect(
      resolveGettingStartedResumeStep({
        ...setupDone,
        businessPolicyId: null,
      })
    ).toBe("profit")
  })

  test("old step ids redirect to the steps that replaced them", () => {
    expect(resolveLegacyGettingStartedStep("charges")).toBe("shares-charges")
    expect(resolveLegacyGettingStartedStep("shares")).toBe("shares-charges")
    expect(resolveLegacyGettingStartedStep("profit-policy")).toBe("profit")
    expect(resolveLegacyGettingStartedStep("business")).toBe("profit")
    expect(resolveLegacyGettingStartedStep("start-date")).toBe("setup-mode")
    expect(resolveLegacyGettingStartedStep("profit")).toBeNull()
    expect(resolveLegacyGettingStartedStep(null)).toBeNull()
  })

  test("steps map to the shared journey numbers", () => {
    const input = progress({
      migrationSetup: { confirmedAt: null, mode: "historical_backfill" },
    })

    expect(getOrderedGettingStartedStepKeys(input)).toEqual([
      "setup-mode",
      "operation-profile",
      "shares-charges",
      "profit",
      "profit-seasons",
      "review-setup",
    ])
    expect(getOrderedGettingStartedStepKeys(progress())).not.toContain(
      "profit-seasons"
    )
    expect(getJourneyStepKey("profit-seasons")).toBe("profit")
    expect(getJourneyStepKey("admin-member")).toBe("add-members")
    expect(getJourneyStepKey("review")).toBe("go-live")
    expect(getPreviousGettingStartedStep("setup-mode", input)).toBeNull()
    expect(getNextGettingStartedStep("profit", input)).toBe("profit-seasons")
    expect(getNextGettingStartedStep("profit", progress())).toBe("review-setup")
    expect(getNextGettingStartedStep("review-setup", input)).toBe(
      "admin-member"
    )
  })

  test("the rail locks steps 1–4 and opens later steps only when earned", () => {
    const rail = buildOnePathRailSteps({
      ...progress({
        migrationSetup: { confirmedAt: "a", mode: "brought_forward" },
      }),
      activeStep: "operation-profile",
    })
    const byKey = Object.fromEntries(rail.map((step) => [step.key, step]))

    expect(rail).toHaveLength(11)
    expect(byKey["sign-up"]).toEqual({
      href: null,
      key: "sign-up",
      state: "complete",
    })
    expect(byKey["setup-mode"]?.state).toBe("complete")
    expect(byKey["setup-mode"]?.href).toBe("/getting-started?step=setup-mode")
    expect(byKey["operation-profile"]?.state).toBe("current")
    expect(byKey["shares-charges"]).toMatchObject({
      href: null,
      state: "upcoming",
    })
    expect(byKey["add-members"]?.href).toBeNull()
    expect(byKey["go-live"]?.href).toBeNull()
  })

  test("step 10 is not done before setup, even when no history is due", () => {
    const rail = buildOnePathRailSteps({
      ...progress({
        migrationSetup: { confirmedAt: null, mode: "historical_backfill" },
        snapshot: {
          canUseLiveFinancialWrites: false,
          // A current-month cooperative: the admin has no history due.
          missingStepKeys: ["charge_schedules", "finalization"],
          status: "historical_setup_in_progress",
        },
      }),
      activeStep: "setup-mode",
    })
    const byKey = Object.fromEntries(rail.map((step) => [step.key, step]))

    expect(byKey["add-members"]).toMatchObject({
      href: null,
      state: "upcoming",
    })
    expect(byKey["go-live"]).toMatchObject({ href: null, state: "upcoming" })
  })
})
