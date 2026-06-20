"use client"

import { useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { MemberCreateForm } from "@/components/forms/member-forms"

export function MemberCreateModal({
  devMode,
  memberNumberPrefix,
}: {
  devMode: boolean
  memberNumberPrefix?: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant={open ? "default" : "outline"} className="rounded-full" onClick={() => setOpen(true)}>
        New member
      </Button>

      <DialogContent className="sm:max-w-4xl lg:max-w-6xl">
        <DialogHeader>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Members</p>
            <DialogTitle>Create member</DialogTitle>
            <DialogDescription>
              Midday-style quick capture for a new member, their current savings state, and any existing active loan.
            </DialogDescription>
          </div>
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5">
          <MemberCreateForm devMode={devMode} inModal memberNumberPrefix={memberNumberPrefix} onSuccess={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
