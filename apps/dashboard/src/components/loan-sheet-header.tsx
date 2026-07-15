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
  request: "Request loan",
  review: "Review request",
} as const

export function LoanSheetHeader() {
  const { loanSheetType } = useLoanParams()
  const title = loanSheetType ? sheetTitles[loanSheetType] : "Loans"

  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>
        Submit requests, review approvals, and complete disbursement from the
        loan operations workspace.
      </SheetDescription>
    </SheetHeader>
  )
}
