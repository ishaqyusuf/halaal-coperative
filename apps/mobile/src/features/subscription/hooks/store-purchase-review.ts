export function purchaseReviewAfterVerification(
  reviewRequired: boolean,
  applied: boolean,
  restoring: boolean
) {
  if (!applied) return true
  return restoring ? false : reviewRequired
}
