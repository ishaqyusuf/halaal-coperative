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
  refresh: "Refresh collection statuses",
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
        Post repayments and manage collections follow-up without leaving the
        repayment workspace.
      </SheetDescription>
    </SheetHeader>
  )
}
