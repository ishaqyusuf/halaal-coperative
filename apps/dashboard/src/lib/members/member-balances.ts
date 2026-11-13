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

export function describeShareCapital(summary: Summary) {
  return (summary?.shareCapitalBalance ?? 0) > 0
    ? "Share ledger balance as of today"
    : "No share capital posted"
}

/** Summary lines for the plain-text statement download. */
export function buildMemberBalanceTextLines(summary: Summary) {
  return [
    `Active Commitment: ${summary?.activeCommitmentAmount ?? 0}`,
    `Savings Snapshot: ${summary?.totalSavingsSnapshot ?? 0}`,
    `Special Savings Balance: ${summary?.specialSavingsBalance ?? 0} (opening=${
      summary?.openingSpecialSavingsBalance ?? 0
    } extraSavings=${summary?.totalExtraSavingsContributions ?? 0} refunded=${
      summary?.specialSavingsWithdrawals ?? 0
    })`,
    `Share Capital: ${summary?.shareCapitalBalance ?? 0}`,
    `Outstanding Principal: ${summary?.totalOutstandingPrincipal ?? 0}`,
    `Procurement Outstanding: ${summary?.procurementOutstanding ?? 0}`,
    `Food Purchase Outstanding: ${summary?.foodPurchaseOutstanding ?? 0}`,
    `Total Obligations Outstanding: ${summary?.totalObligationsOutstanding ?? 0}`,
    `Repayments Posted: ${summary?.totalRepaymentsPosted ?? 0}`,
    `Published Dividends: ${summary?.totalDividendAllocations ?? 0}`,
  ]
}
