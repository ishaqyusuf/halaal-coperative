"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"

const sheetTitles = {
  application: "Apply charge",
  definition: "New charge definition",
  reverse: "Reverse charge",
  toggle: "Update charge status",
  version: "Add dated charge update",
  waive: "Waive charge",
} as const

export function ChargeOperationSheetHeader() {
  const { chargeOperationSheetType } = useChargeOperationParams()
  const title = chargeOperationSheetType
    ? sheetTitles[chargeOperationSheetType]
    : "Charges"

  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>
        Manage charge definitions, member charge applications, and corrections
        from the charge control workspace.
      </SheetDescription>
    </SheetHeader>
  )
}
