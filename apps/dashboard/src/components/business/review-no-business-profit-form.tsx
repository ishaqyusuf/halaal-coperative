"use client"

import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useState, useTransition } from "react"
import { useBusinessRefresh } from "@/components/business/use-business-refresh"
import {
  RequestField,
  RequestFormActions,
} from "@/components/requests/request-field"
import { useBusinessParams } from "@/hooks/use-business-params"
import { markBusinessProfitPoolsReviewedAction } from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"

const confirmationWord = "NO BUSINESS PROFITS"

/** Setup step: the cooperative has no past business profit to bring in. */
export function ReviewNoBusinessProfitForm() {
  const refresh = useBusinessRefresh()
  const { setParams } = useBusinessParams()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirmation, setConfirmation] = useState("")
  const [notes, setNotes] = useState("")

  function save() {
    startTransition(async () => {
      try {
        await markBusinessProfitPoolsReviewedAction(
          objectToFormData({ confirmation, notes })
        )
        showSuccess("Marked as done", "No businesses to bring in.")
        await refresh(() => setParams(null))
      } catch (error) {
        showError(
          "Could not save",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="grid gap-5">
      <p className="text-base text-foreground">
        Use this only if the cooperative has never run a business.
      </p>
      <RequestField label={`Type ${confirmationWord}`}>
        <Input
          autoComplete="off"
          disabled={isPending}
          onChange={(event) => setConfirmation(event.target.value)}
          value={confirmation}
        />
      </RequestField>
      <RequestField label="Note" optional>
        <Textarea
          disabled={isPending}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="For example, the meeting where this was agreed"
          value={notes}
        />
      </RequestField>
      <RequestFormActions>
        <Button
          disabled={isPending || confirmation.trim() !== confirmationWord}
          onClick={save}
          type="button"
        >
          {isPending ? "Saving..." : "Mark as done"}
        </Button>
      </RequestFormActions>
    </div>
  )
}
