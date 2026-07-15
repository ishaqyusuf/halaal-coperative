"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

export function MemberBackfillStartSheetHeader() {
  return (
    <SheetHeader>
      <SheetTitle>Start backfill?</SheetTitle>
      <SheetDescription>
        This member joined before the current month. Start the backfill workflow
        to review historical commitments and generated ledger rows.
      </SheetDescription>
    </SheetHeader>
  )
}
