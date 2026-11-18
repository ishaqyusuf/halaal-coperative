/**
 * Approved loans the cooperative has not paid out yet (triage 1.5). They are
 * not part of what the member owes, so every reader shows them on their own
 * line, and only when there is at least one.
 */
export const APPROVED_NOT_PAID_OUT_LABEL = "Approved, not yet paid out"

type ApprovedNotPaidOutSource =
  | { approvedNotPaidOutAmount?: number; approvedNotPaidOutCount?: number }
  | null
  | undefined

export function describeApprovedNotPaidOut(summary: ApprovedNotPaidOutSource) {
  const count = summary?.approvedNotPaidOutCount ?? 0

  return count === 1
    ? "1 loan approved. Not owed until it is paid out."
    : `${count} loans approved. Not owed until they are paid out.`
}

/** The mobile metric for the line, or `null` when nothing waits. */
export function buildApprovedNotPaidOutMetric(
  summary: ApprovedNotPaidOutSource
) {
  if ((summary?.approvedNotPaidOutCount ?? 0) <= 0) return null

  return {
    detail: describeApprovedNotPaidOut(summary),
    format: "currency" as const,
    key: "approved-not-paid-out",
    label: APPROVED_NOT_PAID_OUT_LABEL,
    value: summary?.approvedNotPaidOutAmount ?? 0,
  }
}

/** Zero or one metric, ready to spread into a stats list. */
export function approvedNotPaidOutMetrics(summary: ApprovedNotPaidOutSource) {
  const metric = buildApprovedNotPaidOutMetric(summary)

  return metric ? [metric] : []
}
