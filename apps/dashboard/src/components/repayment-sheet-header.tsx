"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useRepaymentParams } from "@/hooks/use-repayment-params"

const sheetTitles = {
  followUp: "Collection follow-up",
  post: "Post repayment",
  repaymentDetails: "Repayment details",
  refresh: "Refresh collection statuses",
  scheduleDetails: "Installment details",
} as const

export function RepaymentSheetHeader() {
  const { repaymentSheetType } = useRepaymentParams()
  const title = repaymentSheetType
    ? sheetTitles[repaymentSheetType]
    : "Repayments"

  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>
        {repaymentSheetType === "repaymentDetails"
          ? "Review the posted repayment, linked financing, and audit evidence."
          : repaymentSheetType === "scheduleDetails"
            ? "Review the installment balance, collection activity, and available actions."
            : "Post repayments and manage collections follow-up without leaving the repayment workspace."}
      </SheetDescription>
    </SheetHeader>
  )
}
