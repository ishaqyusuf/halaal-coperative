import type { MemberStatementSummary } from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"

/**
 * Member balance presentation shared by the member dashboard, the staff
 * member detail, the statement page and the statement export. All values come
 * from `MemberStatementSummary`, which already folds in the applied opening
 * position (special savings, share capital, procurement and food balances).
 */
type Summary = MemberStatementSummary | null | undefined

export function describeSpecialSavings(summary: Summary) {
  const opening = summary?.openingSpecialSavingsBalance ?? 0
  const posted = summary?.totalExtraSavingsContributions ?? 0
  const withdrawn = summary?.specialSavingsWithdrawals ?? 0

  if (!opening && !posted && !withdrawn) return "No special savings yet"

  return [
    opening ? `${formatCurrency(opening)} opening` : null,
    posted ? `${formatCurrency(posted)} extra savings` : null,
    withdrawn ? `${formatCurrency(withdrawn)} refunded` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

export function getOtherObligationsOutstanding(summary: Summary) {
  return (
    (summary?.procurementOutstanding ?? 0) +
    (summary?.foodPurchaseOutstanding ?? 0)
  )
}

export function describeOtherObligations(summary: Summary) {
  const procurement = summary?.procurementOutstanding ?? 0
  const food = summary?.foodPurchaseOutstanding ?? 0

  if (!procurement && !food) return "Nothing owed"

  return `Procurement ${formatCurrency(procurement)} · Food ${formatCurrency(food)}`
}

/** Approved loans not yet paid out: shown on their own line, never as owed. */
export function describeApprovedNotPaidOut(summary: Summary) {
  const count = summary?.approvedNotPaidOutCount ?? 0

  return count === 1
    ? "1 loan approved. Not owed until it is paid out."
    : `${count} loans approved. Not owed until they are paid out.`
}

export function describeShareCapital(summary: Summary) {
  return (summary?.shareCapitalBalance ?? 0) > 0
    ? "Share ledger balance as of today"
    : "No share capital posted"
}

/** Balance lines for the plain-text statement download. */
export function buildMemberBalanceTextLines(summary: Summary) {
  const otherObligations = getOtherObligationsOutstanding(summary)

  return [
    `Monthly savings: ${formatCurrency(summary?.activeCommitmentAmount ?? 0)}`,
    ``,
    `What you have`,
    `Savings: ${formatCurrency(summary?.totalSavingsSnapshot ?? 0)}`,
    `Special savings: ${formatCurrency(summary?.specialSavingsBalance ?? 0)} (${describeSpecialSavings(summary)})`,
    `Shares: ${formatCurrency(summary?.shareCapitalBalance ?? 0)}`,
    `Profit shared: ${formatCurrency(summary?.totalDividendAllocations ?? 0)}`,
    ``,
    `What you owe`,
    `Loans: ${formatCurrency(summary?.totalOutstandingPrincipal ?? 0)}`,
    ...((summary?.approvedNotPaidOutCount ?? 0) > 0
      ? [
          `Approved, not yet paid out: ${formatCurrency(summary?.approvedNotPaidOutAmount ?? 0)} (not counted in what you owe)`,
        ]
      : []),
    `Procurement and food: ${formatCurrency(otherObligations)} (${describeOtherObligations(summary)})`,
    `Total owed: ${formatCurrency(summary?.totalObligationsOutstanding ?? 0)}`,
  ]
}
