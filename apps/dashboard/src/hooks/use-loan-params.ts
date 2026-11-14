import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const loanSheetTypes = [
  "request",
  "request-details",
  "review",
  "guarantor",
  "disburse",
  "loan-details",
] as const

export type LoanSheetType = (typeof loanSheetTypes)[number]

export const loanParamsSchema = {
  guarantorApprovalId: parseAsString,
  guarantorReviewStatus: parseAsStringEnum(["approved", "rejected"]),
  loanId: parseAsString,
  loanRequestId: parseAsString,
  loanReviewStatus: parseAsStringEnum(["approved", "rejected", "under_review"]),
  loanSheetType: parseAsStringEnum([...loanSheetTypes]),
}

type LoanSheetOpenParams = {
  guarantorApprovalId?: string
  guarantorReviewStatus?: "approved" | "rejected"
  loanId?: string
  loanRequestId?: string
  loanReviewStatus?: "approved" | "rejected" | "under_review"
  loanSheetType: LoanSheetType
}

export function useLoanParams() {
  const [params, setParams] = useQueryStates(loanParamsSchema)

  return {
    ...params,
    /** Opens one loan sheet or confirm; every other loan param is cleared. */
    open: (next: LoanSheetOpenParams) =>
      setParams({
        guarantorApprovalId: next.guarantorApprovalId ?? null,
        guarantorReviewStatus: next.guarantorReviewStatus ?? null,
        loanId: next.loanId ?? null,
        loanRequestId: next.loanRequestId ?? null,
        loanReviewStatus: next.loanReviewStatus ?? null,
        loanSheetType: next.loanSheetType,
      }),
    setParams,
  }
}

export const loadLoanParams = createLoader(loanParamsSchema)
