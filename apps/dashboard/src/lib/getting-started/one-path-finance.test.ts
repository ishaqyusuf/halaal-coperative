import { describe, expect, test } from "bun:test"
import {
  buildProfitPolicyPayload,
  chargeWhenLabel,
  chargeWhenOptions,
  fillFirstRowEffectiveFrom,
  historicalProfitMigrationModeOptions,
  prepareOnePathSaves,
  profitFrequencyLabel,
  profitFrequencyOptions,
  reserveForSharedPercentage,
  resolveDefaultEffectiveFrom,
  runOnePathSaves,
  summarizeProfitSplit,
} from "./one-path-finance"

describe("One Path finance labels", () => {
  test("maps every charge frequency to a plain When label", () => {
    expect(chargeWhenOptions.map((option) => option.value)).toEqual([
      "recurring_monthly",
      "per_contribution",
      "one_time",
      "manual",
    ])
    expect(chargeWhenLabel("recurring_monthly")).toBe("Every month")
    expect(chargeWhenLabel("per_contribution")).toBe("With each payment")
    expect(chargeWhenLabel("one_time")).toBe("Once, when a member joins")
    expect(chargeWhenLabel("manual")).toBe("Only when we apply it")
  })

  test("maps every profit frequency to a plain label", () => {
    expect(profitFrequencyOptions.map((option) => option.value)).toEqual([
      "annual",
      "semi_annual",
      "quarterly",
      "ad_hoc",
    ])
    expect(profitFrequencyLabel("annual")).toBe("Once a year")
    expect(profitFrequencyLabel("semi_annual")).toBe("Twice a year")
    expect(profitFrequencyLabel("quarterly")).toBe("Every quarter")
    expect(profitFrequencyLabel("ad_hoc")).toBe("Whenever we decide")
  })

  test("covers every historical profit mode with a plain label", () => {
    expect(
      historicalProfitMigrationModeOptions.map((option) => option.value)
    ).toEqual([
      "manual_review_required",
      "import_historical_profit_pools",
      "no_historical_business_profit",
    ])
  })
})

describe("profit split", () => {
  test("fills the reserve with 100 minus the shared percentage", () => {
    expect(reserveForSharedPercentage("100")).toBe("0")
    expect(reserveForSharedPercentage("80")).toBe("20")
    expect(reserveForSharedPercentage("33.33")).toBe("66.67")
    expect(reserveForSharedPercentage("0")).toBe("100")
  })

  test("leaves the reserve alone when the shared value cannot be split", () => {
    expect(reserveForSharedPercentage("")).toBeNull()
    expect(reserveForSharedPercentage("abc")).toBeNull()
    expect(reserveForSharedPercentage("120")).toBeNull()
    expect(reserveForSharedPercentage("-5")).toBeNull()
  })

  test("reports whether the split adds up to 100%", () => {
    expect(summarizeProfitSplit("100", "0")).toMatchObject({
      isComplete: true,
      message: "Adds up to 100%",
    })
    expect(summarizeProfitSplit("33.33", "66.67").isComplete).toBe(true)
    expect(summarizeProfitSplit("70", "20")).toMatchObject({
      isComplete: false,
      message: "Adds up to 90%. It needs to be 100%.",
      total: 90,
    })
    expect(summarizeProfitSplit("100", "").isComplete).toBe(true)
  })
})

describe("profit policy payload", () => {
  test("sends the fixed basis, expense treatment and the real approval state", () => {
    const payload = buildProfitPolicyPayload({
      defaultDistributablePercentage: "100",
      financialYearStartMonth: "1",
      historicalProfitMigrationMode: "manual_review_required",
      profitDistributionFrequency: "annual",
      requiresProfitDistributionApproval: false,
      reserveRetentionPercentage: "",
    })

    expect(payload).toEqual({
      defaultDistributablePercentage: "100",
      distributionBasis: "share_capital_balance",
      expenseTreatment: "deduct_reviewed_expenses_before_distribution",
      financialYearStartMonth: "1",
      historicalProfitMigrationMode: "manual_review_required",
      profitDistributionFrequency: "annual",
      requiresProfitDistributionApproval: "false",
      reserveRetentionPercentage: "0",
    })
    expect(
      buildProfitPolicyPayload({
        ...payload,
        historicalProfitMigrationMode: "manual_review_required",
        profitDistributionFrequency: "annual",
        requiresProfitDistributionApproval: true,
      }).requiresProfitDistributionApproval
    ).toBe("true")
  })
})

describe("default effective dates", () => {
  test("fills only the first dated row, and only when it has an amount", () => {
    const rows = [
      { amount: "500", effectiveFrom: "", id: "a" },
      { amount: "700", effectiveFrom: "", id: "b" },
    ]

    expect(fillFirstRowEffectiveFrom(rows, "2026-11-05")).toEqual([
      { amount: "500", effectiveFrom: "2026-11-05", id: "a" },
      { amount: "700", effectiveFrom: "", id: "b" },
    ])
    expect(
      fillFirstRowEffectiveFrom(
        [{ amount: "", effectiveFrom: "", id: "a" }],
        "2026-11-05"
      )
    ).toEqual([{ amount: "", effectiveFrom: "", id: "a" }])
    expect(
      fillFirstRowEffectiveFrom(
        [{ amount: "500", effectiveFrom: "2025-01-01", id: "a" }],
        "2026-11-05"
      )[0]?.effectiveFrom
    ).toBe("2025-01-01")
    expect(fillFirstRowEffectiveFrom(rows, null)).toBe(rows)
  })

  test("never defaults before the cooperative start date", () => {
    expect(
      resolveDefaultEffectiveFrom({
        financeStartDate: "2024-01-01",
        today: "2026-11-05",
      })
    ).toBe("2026-11-05")
    expect(
      resolveDefaultEffectiveFrom({
        financeStartDate: "2027-01-01",
        today: "2026-11-05",
      })
    ).toBe("2027-01-01")
    expect(
      resolveDefaultEffectiveFrom({
        financeStartDate: null,
        today: "2026-11-05",
      })
    ).toBe("2026-11-05")
  })
})

describe("One Path save sequence", () => {
  test("validates every section before saving, then saves in order", async () => {
    const calls: string[] = []
    const tasks = await prepareOnePathSaves([
      () => {
        calls.push("validate:shares")
        return async () => {
          calls.push("save:shares")
        }
      },
      async () => {
        calls.push("validate:charges")
        return async () => {
          calls.push("save:charges")
        }
      },
    ])

    expect(tasks).not.toBeNull()
    await runOnePathSaves(tasks!)
    expect(calls).toEqual([
      "validate:shares",
      "validate:charges",
      "save:shares",
      "save:charges",
    ])
  })

  test("saves nothing when a section is invalid", async () => {
    const calls: string[] = []
    const tasks = await prepareOnePathSaves([
      () => async () => {
        calls.push("save:shares")
      },
      () => null,
      () => {
        calls.push("validate:never")
        return null
      },
    ])

    expect(tasks).toBeNull()
    expect(calls).toEqual([])
  })

  test("stops at the first failed save", async () => {
    const calls: string[] = []

    await expect(
      runOnePathSaves([
        async () => {
          throw new Error("share policy rejected")
        },
        async () => {
          calls.push("save:charges")
        },
      ])
    ).rejects.toThrow("share policy rejected")
    expect(calls).toEqual([])
  })
})
