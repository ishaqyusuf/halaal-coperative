"use client"

import { useTransition } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { queueBackfillDraftAction } from "@/lib/dashboard-actions"

// Saving a draft is not consequential, so it is a direct action with a toast
// rather than an overlay (ADR-20261105 decision 5, items X13 and X17).
export function SaveBackfillDraftButton({ memberId }: { memberId: string }) {
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function saveDraft() {
    const formData = new FormData()
    formData.set("memberId", memberId)

    startTransition(async () => {
      try {
        await queueBackfillDraftAction(formData)
        showSuccess(
          "Saved for later",
          "Come back to check and add these months."
        )
      } catch (error) {
        showError(
          "Could not save",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Button
      disabled={isPending}
      onClick={saveDraft}
      size="sm"
      type="button"
      variant="outline"
    >
      {isPending ? "Saving…" : "Save for later"}
    </Button>
  )
}
