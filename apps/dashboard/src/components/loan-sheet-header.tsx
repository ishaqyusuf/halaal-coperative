"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useLoanParams } from "@/hooks/use-loan-params"

const sheetTitles = {
  disburse: "Disburse loan",
  guarantor: "Review guarantor",
  "loan-details": "Loan details",
  request: "Request loan",
  "request-details": "Loan request details",
  review: "Review request",
} as const

const sheetDescriptions = {
  disburse:
    "Confirm the repayment start date before posting this approved loan disbursement.",
  guarantor:
    "Record the guarantor decision and supporting evidence for this request.",
  "loan-details":
    "Review principal, outstanding balance, servicing, and repayment schedule.",
  request:
    "Choose the product, amount, repayment term, and any extra monthly savings commitment.",
  "request-details":
    "Review the request amount, product, term, status, charges, and guarantor decisions.",
  review:
    "Record the staff review decision and supporting note for this request.",
} as const

export function LoanSheetHeader() {
  const { loanSheetType } = useLoanParams()
  const title = loanSheetType ? sheetTitles[loanSheetType] : "Loans"
  const description = loanSheetType
    ? sheetDescriptions[loanSheetType]
    : "Submit requests, review approvals, and complete disbursement from the loan operations workspace."

  return (
    <SheetHeader className="px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>{description}</SheetDescription>
    </SheetHeader>
  )
}
