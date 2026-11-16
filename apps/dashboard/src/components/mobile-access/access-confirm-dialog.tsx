"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@halaalvest/ui/components/alert-dialog"
import { Label } from "@halaalvest/ui/components/label"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useState } from "react"

export type AccessConfirmation = {
  title: string
  description: string
  actionLabel: string
  destructive?: boolean
  /** One reason field at most (ADR-20261105 decision 4). */
  reason?: "optional" | "required"
}

/**
 * The confirm for every consequential mobile access change: approve, decline,
 * turn off, turn back on, give access and the cooperative on/pause switch.
 * The backdrop never closes it.
 */
export function AccessConfirmDialog({
  confirmation,
  error,
  onClose,
  onConfirm,
  pending,
}: {
  confirmation: AccessConfirmation
  error?: string
  onClose: () => void
  onConfirm: (reason: string) => void
  pending: boolean
}) {
  const [reason, setReason] = useState("")
  const reasonMissing = confirmation.reason === "required" && !reason.trim()

  return (
    <AlertDialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent className="data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-[455px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold">
            {confirmation.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-foreground/80">
            {confirmation.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {confirmation.reason ? (
          <div className="grid gap-2">
            <Label className="text-base" htmlFor="mobile-access-reason">
              {confirmation.reason === "required"
                ? "Reason"
                : "Reason (optional)"}
            </Label>
            <Textarea
              className="text-base"
              disabled={pending}
              id="mobile-access-reason"
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              value={reason}
            />
            <p className="text-sm text-muted-foreground">
              The member sees this.
            </p>
          </div>
        ) : null}
        {error ? (
          <p className="text-base text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel
            size="touch"
            className="text-base"
            disabled={pending}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            size="touch"
            className="text-base"
            disabled={pending || reasonMissing}
            onClick={() => onConfirm(reason.trim())}
            variant={confirmation.destructive ? "destructive" : "default"}
          >
            {pending ? "Saving…" : confirmation.actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
