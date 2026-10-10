export function canFinalizeLoanRequest(status: string) {
  return status === "submitted" || status === "under_review"
}

export function canMarkLoanRequestUnderReview(status: string) {
  return status === "submitted"
}
