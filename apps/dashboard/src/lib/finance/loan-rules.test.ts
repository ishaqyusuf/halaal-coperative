import { describe, expect, test } from "bun:test"
import {
  getLoanRuleChanges,
  getLoanSplitPreview,
  type LoanRules,
  validateLoanRules,
} from "./loan-rules"

const rules: LoanRules = {
  activeFinancingBlocksEmergency: true,
  activeFinancingBlocksProcurement: true,
  disbursementRequiresDeployableFunds: true,
  foodPurchaseAllowsCommitmentReductionDuringPayback: false,
  foodPurchaseMaximumPaybackMonths: "1",
  loanEligibilityMultiple: "2",
  procurementAllowsCommitmentReductionDuringPayback: false,
  procurementMaximumPaybackMonths: "12",
  quickLoanAllocationPercentage: "30",
  requiresDualLoanApproval: false,
  reserveBufferAmount: "450000",
  specialSavingsCountsForEligibility: true,
  strictCommitmentDuringFinancing: true,
}

describe("loan rules", () => {
  test("the split matches the server: expected savings minus reserve, quick part, rest normal", () => {
    expect(getLoanSplitPreview(rules, 10_470_000)).toEqual({
      normal: 7_014_000,
      normalPercentage: 70,
      quick: 3_006_000,
      total: 10_020_000,
    })
  })

  test("a reserve above expected savings leaves nothing to lend", () => {
    expect(
      getLoanSplitPreview({ ...rules, reserveBufferAmount: "20000000" }, 10_470_000)
        .total
    ).toBe(0)
  })

  test("changes list only what differs, in plain words", () => {
    expect(
      getLoanRuleChanges(rules, {
        ...rules,
        quickLoanAllocationPercentage: "40",
        requiresDualLoanApproval: true,
        reserveBufferAmount: "450000.00",
      })
    ).toEqual([
      { from: "30%", label: "Part for quick loans", to: "40%" },
      { from: "No", label: "Two people approve each loan", to: "Yes" },
    ])
  })

  test("validation names the first problem", () => {
    expect(validateLoanRules(rules)).toBeNull()
    expect(validateLoanRules({ ...rules, quickLoanAllocationPercentage: "120" })).toBe(
      "The part for quick loans must be between 0 and 100."
    )
    expect(validateLoanRules({ ...rules, procurementMaximumPaybackMonths: "1.5" })).toBe(
      "Enter the longest repayment for purchases in whole months."
    )
  })
})
