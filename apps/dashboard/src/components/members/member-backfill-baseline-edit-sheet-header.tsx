"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

export function MemberBackfillBaselineEditSheetHeader() {
  return (
    <SheetHeader>
      <SheetTitle>Edit basic information</SheetTitle>
      <SheetDescription>
        Update profile details only. Member No., joined date, and
        brought-forward balances or commitment history stay on the migration
        steps.
      </SheetDescription>
    </SheetHeader>
  )
}
