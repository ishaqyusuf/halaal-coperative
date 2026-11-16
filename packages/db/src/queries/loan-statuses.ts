/**
 * Loans that count as the member "having financing" for the policy blocks
 * (quick financing, procurement, commitment reductions). Approved loans count
 * even before they are paid out, so the same money is never promised twice
 * (triage 1.5). Matches the server-side checks in `loans.ts`,
 * `procurement.ts` and `contributions.ts`.
 */
export const financingBlockingLoanStatuses = [
  "approved",
  "disbursed",
  "active",
] as const
