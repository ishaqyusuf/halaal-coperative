"use client"

import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import type { CreatedMemberSummary } from "@/components/forms/member-forms"
import { MemberBackfillStartContent } from "@/components/member-backfill-start-content"
import { MemberBackfillStartSheetHeader } from "@/components/member-backfill-start-sheet-header"

export function MemberBackfillStartSheet({
  member,
  onLater,
  onStartBackfill,
  open,
}: {
  member: CreatedMemberSummary | null
  onLater: () => void
  onStartBackfill: () => void
  open: boolean
}) {
  if (!member) {
    return null
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onLater()
        }
      }}
    >
      <SheetContent className="w-[calc(100%-2rem)] p-4 sm:w-full sm:max-w-[455px]">
        <MemberBackfillStartSheetHeader />
        <MemberBackfillStartContent
          member={member}
          onLater={onLater}
          onStartBackfill={onStartBackfill}
        />
      </SheetContent>
    </Sheet>
  )
}
