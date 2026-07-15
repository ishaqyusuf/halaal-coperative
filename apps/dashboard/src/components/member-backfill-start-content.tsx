"use client"

import { Button } from "@halaalvest/ui/components/button"
import { SheetFooter } from "@halaalvest/ui/components/sheet"
import type { CreatedMemberSummary } from "@/components/forms/member-forms"

export function MemberBackfillStartContent({
  member,
  onLater,
  onStartBackfill,
}: {
  member: CreatedMemberSummary
  onLater: () => void
  onStartBackfill: () => void
}) {
  return (
    <>
      <div className="rounded-md border border-border/70 bg-background/70 px-3 py-2 text-sm">
        <p className="font-medium text-foreground">{member.fullName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {member.memberNumber} - joined {member.joinedAt.slice(0, 10)}
        </p>
      </div>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onLater}>
          Later
        </Button>
        <Button type="button" onClick={onStartBackfill}>
          Start backfill
        </Button>
      </SheetFooter>
    </>
  )
}
