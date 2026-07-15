"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"

const sheetTitles = {
  apply: "Apply monthly row",
  cancel: "Cancel monthly row",
  create: "Create monthly record",
  generate: "Generate due records",
  settings: "Monthly record settings",
} as const

export function MonthlyRecordSheetHeader() {
  const { monthlyRecordSheetType } = useMonthlyRecordParams()
  const title = monthlyRecordSheetType
    ? sheetTitles[monthlyRecordSheetType]
    : "Monthly records"

  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>
        Confirm monthly record generation, settings, and member-row posting
        actions from a focused workflow.
      </SheetDescription>
    </SheetHeader>
  )
}
