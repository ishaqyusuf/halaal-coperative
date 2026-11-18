import { describe, expect, test } from "bun:test"
import {
  buildMemberBalanceTextLines,
  describeApprovedNotPaidOut,
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
      "Special savings: ₦205,000 (₦200,000 opening · ₦5,000 extra savings)"
    )
    expect(lines).toContain("Shares: ₦10,000")
    expect(lines).toContain(
      "Procurement and food: ₦525,000 (Procurement ₦500,000 · Food ₦25,000)"
    )
    expect(lines).toContain("Total owed: ₦1,771,667")
    expect(lines.some((line) => line.startsWith("Approved"))).toBe(false)
  })

  test("approved loans not yet paid out get their own line, outside what is owed", () => {
    const lines = buildMemberBalanceTextLines({
      ...(summary as object),
      approvedNotPaidOutAmount: 40000,
      approvedNotPaidOutCount: 1,
    } as never)

    expect(lines).toContain(
      "Approved, not yet paid out: ₦40,000 (not counted in what you owe)"
    )
    expect(lines).toContain("Loans: ₦1,246,667")
    expect(lines).toContain("Total owed: ₦1,771,667")
    expect(
      describeApprovedNotPaidOut({ approvedNotPaidOutCount: 2 } as never)
    ).toBe("2 loans approved. Not owed until they are paid out.")
  })
})
