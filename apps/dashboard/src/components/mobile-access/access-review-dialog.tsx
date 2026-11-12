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
import { Label } from "@halaalvest/ui/components/label"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useState, type FormEvent } from "react"

export type AccessDecision = "approve" | "reject" | "revoke" | "reinstate"

const actions = {
  approve: {
    description:
      "The member can sign in immediately. The agreed charge is scheduled for the end of the approval month.",
    label: "Approve access",
  },
  reject: {
    description:
      "The member will need to submit a new request before you can approve their access.",
    label: "Decline request",
  },
  revoke: {
    description:
      "The member will lose mobile access. The cooperative charge remains due.",
    label: "Revoke access",
  },
  reinstate: {
    description:
      "The member can sign in for the remainder of the original term.",
    label: "Restore access",
  },
}

export function AccessReviewDialog({
  action,
  error,
  memberName,
  onClose,
  onSubmit,
  pending,
}: {
  action: AccessDecision
  error?: string
  memberName: string
  onClose: () => void
  onSubmit: (note: string) => void
  pending: boolean
}) {
  const [note, setNote] = useState("")
  const details = actions[action]
  const requiresNote = action !== "approve"

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pending && (!requiresNote || note.trim())) {
      onSubmit(note.trim())
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>
            {details.label} for {memberName}
          </DialogTitle>
          <DialogDescription>{details.description}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="mobile-access-review-note">
              {action === "reject" || action === "revoke"
                ? "Reason shown to the member"
                : requiresNote
                  ? "Reason"
                  : "Note (optional)"}
            </Label>
            <Textarea
              disabled={pending}
              id="mobile-access-review-note"
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              required={requiresNote}
              value={note}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={pending || (requiresNote && !note.trim())}
              type="submit"
              variant={action === "revoke" ? "destructive" : "default"}
            >
              {pending ? "Saving…" : details.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
