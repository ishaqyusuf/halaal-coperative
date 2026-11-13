// Sample member statement for the One Place homepage hero. Every month
// reconciles with the next: savings grow by the payroll contribution and
// financing FN-0192 falls by one principal-only repayment.

export const sampleFinancing = {
  monthlyRepayment: 30_000,
  reference: "FN-0192",
  termMonths: 18,
  totalPayable: 540_000,
} as const

export const sampleMonthlyContribution = 25_000

export const statementMonthKeys = ["aug", "sep", "oct"] as const

export type StatementMonthKey = (typeof statementMonthKeys)[number]

type StatementMonthSource = {
  batch: string
  broughtForward: number
  closedOn: string
  label: string
  postedOn: string
  repaymentNumber: number
}

export type StatementMonth = StatementMonthSource & {
  contribution: number
  financingLeft: number
  key: StatementMonthKey
  savingsBalance: number
}

const statementMonthSources = {
  aug: {
    batch: "PD-2608",
    broughtForward: 362_000,
    closedOn: "31 Aug",
    label: "Aug 2026",
    postedOn: "25 Aug",
    repaymentNumber: 1,
  },
  sep: {
    batch: "PD-2609",
    broughtForward: 387_000,
    closedOn: "30 Sep",
    label: "Sep 2026",
    postedOn: "25 Sep",
    repaymentNumber: 2,
  },
  oct: {
    batch: "PD-2610",
    broughtForward: 412_000,
    closedOn: "31 Oct",
    label: "Oct 2026",
    postedOn: "25 Oct",
    repaymentNumber: 3,
  },
} satisfies Record<StatementMonthKey, StatementMonthSource>

export const statementMonths = Object.fromEntries(
  statementMonthKeys.map((key) => {
    const source = statementMonthSources[key]

    return [
      key,
      {
        ...source,
        contribution: sampleMonthlyContribution,
        financingLeft:
          sampleFinancing.totalPayable -
          sampleFinancing.monthlyRepayment * source.repaymentNumber,
        key,
        savingsBalance: source.broughtForward + sampleMonthlyContribution,
      },
    ]
  })
) as Record<StatementMonthKey, StatementMonth>

export const defaultStatementMonthKey: StatementMonthKey = "oct"

export const sampleBatchOfficer = "A. Danjuma"

const nairaAmountFormat = new Intl.NumberFormat("en-NG", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

export function formatStatementAmount(value: number) {
  return nairaAmountFormat.format(value)
}

export function describeStatementMonth(month: StatementMonth) {
  return `Statement to ${month.closedOn}: savings ₦${formatStatementAmount(
    month.savingsBalance
  )}, financing left to repay ₦${formatStatementAmount(month.financingLeft)}.`
}

export type StatementBalances = {
  financingLeft: number
  savingsBalance: number
}

// Ease-out-expo count-up between two months' balances. `progress` is 0..1.
export function interpolateStatementBalances(
  from: StatementBalances,
  to: StatementBalances,
  progress: number
): StatementBalances {
  const clamped = Math.min(1, Math.max(0, progress))
  const eased = clamped === 1 ? 1 : 1 - Math.pow(2, -10 * clamped)

  return {
    financingLeft: Math.round(
      from.financingLeft + (to.financingLeft - from.financingLeft) * eased
    ),
    savingsBalance: Math.round(
      from.savingsBalance + (to.savingsBalance - from.savingsBalance) * eased
    ),
  }
}
