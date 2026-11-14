import { describe, expect, test } from "bun:test"
import {
  getFinanceLockWords,
  getLoanProductWords,
  getProfitSeasonPattern,
  getShareModelWords,
} from "./finance-settings-words"

describe("finance settings words", () => {
  test("profit seasons follow the frequency and the financial year", () => {
    expect(getProfitSeasonPattern("annual", 1)).toBe("Jan–Dec each year")
    expect(getProfitSeasonPattern("semi_annual", 1)).toBe("Jan–Jun and Jul–Dec")
    expect(getProfitSeasonPattern("quarterly", 4)).toBe(
      "Apr–Jun, Jul–Sep, Oct–Dec and Jan–Mar"
    )
    expect(getProfitSeasonPattern("ad_hoc", 1)).toBe("When the board decides")
  })

  test("share model in plain words", () => {
    expect(
      getShareModelWords({
        compulsoryShareUnits: 1,
        configurationMode: "unit_based",
        maximumShareUnits: 20,
        unitAmount: 10_000,
      }).detail
    ).toBe("Each member holds 1 to 20 units.")
  })

  test("loan type facts say when it is off", () => {
    expect(
      getLoanProductWords({ isActive: false, maxSavingsMultiple: 2, termMonths: 1 })
    ).toBe("Up to 1 month · up to 2× savings · Off")
  })

  test("no lock line while past setup is open", () => {
    expect(
      getFinanceLockWords({ hasAppliedMemberBackfill: false, isLive: false, isLocked: false })
    ).toBeNull()
  })
})
