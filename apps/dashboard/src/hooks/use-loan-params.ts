import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const loanParamsSchema = {
  guarantorApprovalId: parseAsString,
  guarantorReviewStatus: parseAsStringEnum(["approved", "rejected"]),
  loanId: parseAsString,
  loanRequestId: parseAsString,
  loanReviewStatus: parseAsStringEnum(["approved", "rejected", "under_review"]),
  loanSheetType: parseAsStringEnum([
    "request",
    "request-details",
    "review",
    "guarantor",
    "disburse",
    "loan-details",
  ]),
}

export function useLoanParams() {
  const [params, setParams] = useQueryStates(loanParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadLoanParams = createLoader(loanParamsSchema)
