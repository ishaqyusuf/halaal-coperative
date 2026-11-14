"use client"

import { SheetHeader, SheetTitle } from "@halaalvest/ui/components/sheet"
import { useLoanParams } from "@/hooks/use-loan-params"

const sheetTitles: Record<string, string> = {
  "loan-details": "Loan",
  request: "Ask for a loan",
  "request-details": "Loan request",
}

export function LoanSheetHeader() {
  const { loanSheetType } = useLoanParams()

  return (
    <SheetHeader className="px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-6">
      <SheetTitle className="text-2xl">
        {(loanSheetType && sheetTitles[loanSheetType]) ?? "Loans"}
      </SheetTitle>
    </SheetHeader>
  )
}
