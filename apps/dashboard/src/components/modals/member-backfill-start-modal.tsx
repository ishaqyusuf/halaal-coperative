"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import type { CreatedMemberSummary } from "@/components/forms/member-forms"

export function MemberBackfillStartModal({
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onLater()
        }
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] p-4 sm:w-full sm:max-w-[455px]">
        <DialogHeader>
          <DialogTitle>Start backfill?</DialogTitle>
          <DialogDescription>
            This member joined before the current month. Start the backfill
            workflow to review historical commitments and generated ledger rows.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border/70 bg-background/70 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">{member.fullName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {member.memberNumber} - joined {member.joinedAt.slice(0, 10)}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onLater}>
            Later
          </Button>
          <Button type="button" onClick={onStartBackfill}>
            Start backfill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
