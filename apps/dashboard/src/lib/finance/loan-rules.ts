import { formatCurrency } from "@halaalvest/utils"

/** The loan rules form's values (numbers as typed text). */
export type LoanRules = {
  activeFinancingBlocksEmergency: boolean
  activeFinancingBlocksProcurement: boolean
  disbursementRequiresDeployableFunds: boolean
  foodPurchaseAllowsCommitmentReductionDuringPayback: boolean
  foodPurchaseMaximumPaybackMonths: string
  loanEligibilityMultiple: string
  procurementAllowsCommitmentReductionDuringPayback: boolean
  procurementMaximumPaybackMonths: string
  quickLoanAllocationPercentage: string
  requiresDualLoanApproval: boolean
  reserveBufferAmount: string
  specialSavingsCountsForEligibility: boolean
  strictCommitmentDuringFinancing: boolean
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

/**
 * This month's split under the typed rules, the same sum the server makes
 * when loan requests open: expected savings minus the amount kept aside,
 * then the quick part, then the rest for normal loans.
 */
export function getLoanSplitPreview(
  rules: Pick<LoanRules, "quickLoanAllocationPercentage" | "reserveBufferAmount">,
  projectedCommitmentAmount: number
) {
  const reserve = Math.max(0, Number(rules.reserveBufferAmount) || 0)
  const quickPercentage = Math.min(
    100,
    Math.max(0, Number(rules.quickLoanAllocationPercentage) || 0)
  )
  const total = roundMoney(Math.max(0, projectedCommitmentAmount - reserve))
  const quick = roundMoney((total * quickPercentage) / 100)

  return {
    normal: roundMoney(total - quick),
    normalPercentage: Number((100 - quickPercentage).toFixed(2)),
    quick,
    total,
  }
}

const ruleLabels: Array<{
  format: (value: LoanRules[keyof LoanRules]) => string
  key: keyof LoanRules
  label: string
}> = [
  {
    format: (value) => formatCurrency(Number(value) || 0),
    key: "reserveBufferAmount",
    label: "Kept aside each month",
  },
  {
    format: (value) => `${Number(value)}%`,
    key: "quickLoanAllocationPercentage",
    label: "Part for quick loans",
  },
  {
    format: (value) => `${Number(value)}× savings`,
    key: "loanEligibilityMultiple",
    label: "Most a member can borrow",
  },
  {
    format: (value) => (value ? "Yes" : "No"),
    key: "specialSavingsCountsForEligibility",
    label: "Special savings count",
  },
  {
    format: (value) => (value ? "Yes" : "No"),
    key: "strictCommitmentDuringFinancing",
    label: "Can't lower savings while repaying",
  },
  {
    format: (value) => (value ? "Yes" : "No"),
    key: "activeFinancingBlocksEmergency",
    label: "No quick loan while repaying",
  },
  {
    format: (value) => (value ? "Yes" : "No"),
    key: "activeFinancingBlocksProcurement",
    label: "No purchase while repaying",
  },
  {
    format: (value) => (value ? "Yes" : "No"),
    key: "requiresDualLoanApproval",
    label: "Two people approve each loan",
  },
  {
    format: (value) => (value ? "Yes" : "No"),
    key: "disbursementRequiresDeployableFunds",
    label: "Pay out only when the money is in",
  },
  {
    format: (value) => `${Number(value)} months`,
    key: "procurementMaximumPaybackMonths",
    label: "Longest repayment for purchases",
  },
  {
    format: (value) => `${Number(value)} months`,
    key: "foodPurchaseMaximumPaybackMonths",
    label: "Longest repayment for foodstuff",
  },
  {
    format: (value) => (value ? "Yes" : "No"),
    key: "procurementAllowsCommitmentReductionDuringPayback",
    label: "Lower savings while paying for a purchase",
  },
  {
    format: (value) => (value ? "Yes" : "No"),
    key: "foodPurchaseAllowsCommitmentReductionDuringPayback",
    label: "Lower savings while paying for foodstuff",
  },
]

function sameValue(left: LoanRules[keyof LoanRules], right: LoanRules[keyof LoanRules]) {
  if (typeof left === "boolean" || typeof right === "boolean") {
    return left === right
  }

  return Number(left) === Number(right)
}

/** What changes, in the confirm's words: label, old value, new value. */
export function getLoanRuleChanges(before: LoanRules, after: LoanRules) {
  return ruleLabels
    .filter(({ key }) => !sameValue(before[key], after[key]))
    .map(({ format, key, label }) => ({
      from: format(before[key]),
      label,
      to: format(after[key]),
    }))
}

/** The first problem in plain words, or null. Mirrors the server checks. */
export function validateLoanRules(rules: LoanRules) {
  const quick = Number(rules.quickLoanAllocationPercentage)
  const multiple = Number(rules.loanEligibilityMultiple)
  const reserve = Number(rules.reserveBufferAmount)
  const purchaseMonths = Number(rules.procurementMaximumPaybackMonths)
  const foodMonths = Number(rules.foodPurchaseMaximumPaybackMonths)

  if (rules.quickLoanAllocationPercentage === "" || !(quick >= 0 && quick <= 100)) {
    return "The part for quick loans must be between 0 and 100."
  }

  if (!(multiple > 0)) {
    return "Enter how many times their savings a member can borrow."
  }

  if (rules.reserveBufferAmount === "" || !(reserve >= 0)) {
    return "Enter the amount to keep aside (0 if none)."
  }

  if (!Number.isInteger(purchaseMonths) || purchaseMonths <= 0) {
    return "Enter the longest repayment for purchases in whole months."
  }

  if (!Number.isInteger(foodMonths) || foodMonths <= 0) {
    return "Enter the longest repayment for foodstuff in whole months."
  }

  return null
}
