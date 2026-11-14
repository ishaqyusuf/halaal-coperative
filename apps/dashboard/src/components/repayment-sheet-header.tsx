"use client"

import { SheetHeader, SheetTitle } from "@halaalvest/ui/components/sheet"
import { useRepaymentParams } from "@/hooks/use-repayment-params"

const sheetTitles = {
  followUp: "Follow-up note",
  post: "Record a payment",
  repaymentDetails: "Payment received",
  scheduleDetails: "Payment due",
} as const

export function RepaymentSheetHeader() {
  const { repaymentSheetType } = useRepaymentParams()

  return (
    <SheetHeader>
      <SheetTitle className="text-2xl">
        {repaymentSheetType ? sheetTitles[repaymentSheetType] : "Repayments"}
      </SheetTitle>
    </SheetHeader>
  )
}
