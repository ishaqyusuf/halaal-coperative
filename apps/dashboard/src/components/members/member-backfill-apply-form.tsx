"use client"

import { type FormEvent, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { queueBackfillApplyAction } from "@/lib/dashboard-actions"

export function MemberBackfillApplyForm({
  disabled,
  memberId,
}: {
  disabled: boolean
  memberId: string
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const isDisabled = disabled || isPending

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      try {
        await queueBackfillApplyAction(formData)
        showSuccess(
          "Backfill apply started",
          "The member backfill is being applied."
        )
        router.push("/members")
      } catch (error) {
        showError(
          "Could not apply backfill",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
      onSubmit={onSubmit}
    >
      <input name="memberId" type="hidden" value={memberId} />
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Type APPLY BACKFILL
        <Input
          disabled={isDisabled}
          name="confirmation"
          placeholder="APPLY BACKFILL"
          required
          type="text"
        />
      </label>
      <div className="flex items-end justify-end">
        <Button disabled={isDisabled} type="submit">
          {isPending ? "Applying..." : "Apply backfill"}
        </Button>
      </div>
    </form>
  )
}
