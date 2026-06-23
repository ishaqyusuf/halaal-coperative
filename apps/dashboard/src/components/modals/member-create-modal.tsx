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
  description = "Midday-style quick capture for a new member, their current savings state, and any existing active loan.",
  devMode,
  eyebrow = "Members",
  memberNumberPrefix,
  title = "Create member",
  triggerLabel = "New member",
}: {
  description?: string
  devMode: boolean
  eyebrow?: string
  memberNumberPrefix?: string | null
  title?: string
  triggerLabel?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant={open ? "default" : "outline"}
        className="rounded-full"
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>

      <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden sm:max-w-4xl lg:max-w-6xl">
        <DialogHeader className="shrink-0">
          <div>
            <p className="text-[11px] font-medium tracking-[0.24em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <MemberCreateForm
            devMode={devMode}
            inModal
            memberNumberPrefix={memberNumberPrefix}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
