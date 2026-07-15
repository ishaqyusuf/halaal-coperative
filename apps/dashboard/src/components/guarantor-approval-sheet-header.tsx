"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

export function GuarantorApprovalSheetHeader() {
  return (
    <SheetHeader>
      <SheetTitle>Guarantor response</SheetTitle>
      <SheetDescription>
        Confirm your response to this loan guarantor request.
      </SheetDescription>
    </SheetHeader>
  )
}
