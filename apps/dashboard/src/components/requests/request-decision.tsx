"use client"

import { useState, useTransition, type ReactNode } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { RequestConfirmDialog } from "./request-confirm-dialog"
import type { RequestFact } from "./request-facts"
import { RequestField } from "./request-field"

/**
 * Staff decision on a waiting request, inside its details sheet: the approval
 * fields, then Approve and Decline. Both open a real AlertDialog. Each handler
 * resolves `true` when the save worked.
 */
export function RequestDecision({
  approveExtra,
  approveFacts,
  canApprove,
  children,
  onApprove,
  onDecline,
  onStartChecking,
}: {
  approveExtra?: ReactNode
  approveFacts: RequestFact[]
  canApprove: boolean
  children: ReactNode
  onApprove: () => Promise<boolean>
  onDecline: (reason: string) => Promise<boolean>
  /** Only while the request is still "Waiting". */
  onStartChecking?: () => Promise<boolean>
}) {
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState<"approve" | "decline" | null>(null)
  const [reason, setReason] = useState("")

  function run(action: () => Promise<boolean>) {
    startTransition(async () => {
      if (await action()) setConfirm(null)
    })
  }

  return (
    <section className="grid gap-5 border-t border-border pt-5">
      <h3 className="text-lg font-semibold text-foreground">Your decision</h3>
      {children}
      <div className="grid gap-3 sm:flex sm:flex-wrap [&_button]:h-12 [&_button]:w-full sm:[&_button]:w-auto">
        <Button
          disabled={isPending || !canApprove}
          onClick={() => setConfirm("approve")}
          type="button"
        >
          Approve
        </Button>
        <Button
          disabled={isPending}
          onClick={() => setConfirm("decline")}
          type="button"
          variant="outline"
        >
          Decline
        </Button>
        {onStartChecking ? (
          <Button
            disabled={isPending}
            onClick={() => run(onStartChecking)}
            type="button"
            variant="ghost"
          >
            {isPending && !confirm ? "Saving..." : "Mark as being checked"}
          </Button>
        ) : null}
      </div>

      <RequestConfirmDialog
        confirmLabel="Approve"
        facts={approveFacts}
        onConfirm={() => run(onApprove)}
        onOpenChange={(open) => setConfirm(open ? "approve" : null)}
        open={confirm === "approve"}
        pending={isPending}
        title="Approve this request?"
      >
        {approveExtra}
      </RequestConfirmDialog>

      <RequestConfirmDialog
        confirmLabel="Decline"
        description="The member will be told it was declined."
        destructive
        disabled={!reason.trim()}
        onConfirm={() => run(() => onDecline(reason.trim()))}
        onOpenChange={(open) => setConfirm(open ? "decline" : null)}
        open={confirm === "decline"}
        pending={isPending}
        title="Decline this request?"
      >
        <RequestField label="Reason">
          <Textarea
            disabled={isPending}
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          />
        </RequestField>
      </RequestConfirmDialog>
    </section>
  )
}
