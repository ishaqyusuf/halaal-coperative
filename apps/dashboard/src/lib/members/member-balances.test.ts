import { describe, expect, test } from "bun:test"
import {
  buildMemberBalanceTextLines,
  describeOtherObligations,
  describeSpecialSavings,
  getOtherObligationsOutstanding,
} from "./member-balances"

// Opening position from the 13 Nov 2026 Amana QA (F6): ₦200k special savings,
// ₦10k share capital, ₦500k procurement, ₦25k food, then ₦5k extra savings.
const summary = {
  activeCommitmentAmount: 25000,
  foodPurchaseOutstanding: 25000,
  openingSpecialSavingsBalance: 200000,
  procurementOutstanding: 500000,
  shareCapitalBalance: 10000,
  specialSavingsBalance: 205000,
  specialSavingsWithdrawals: 0,
  totalDividendAllocations: 0,
  totalExtraSavingsContributions: 5000,
  totalObligationsOutstanding: 1771667,
  totalOutstandingPrincipal: 1246667,
  totalRepaymentsPosted: 20000,
  totalSavingsSnapshot: 1060000,
} as never

describe("member balances", () => {
  test("special savings explains the opening balance and extra savings", () => {
    expect(describeSpecialSavings(summary)).toContain("opening")
    expect(describeSpecialSavings(summary)).toContain("extra savings")
    expect(describeSpecialSavings(null)).toBe("No special savings yet")
  })

  test("procurement and food balances add up", () => {
    expect(getOtherObligationsOutstanding(summary)).toBe(525000)
    expect(describeOtherObligations(summary)).toContain("Procurement")
    expect(describeOtherObligations(null)).toBe("Nothing owed")
  })

  test("the statement download lists every opening balance", () => {
    const lines = buildMemberBalanceTextLines(summary)

    expect(lines).toContain(
      "Special Savings Balance: 205000 (opening=200000 extraSavings=5000 refunded=0)"
    )
    expect(lines).toContain("Share Capital: 10000")
    expect(lines).toContain("Procurement Outstanding: 500000")
    expect(lines).toContain("Food Purchase Outstanding: 25000")
    expect(lines).toContain("Total Obligations Outstanding: 1771667")
  })
})
