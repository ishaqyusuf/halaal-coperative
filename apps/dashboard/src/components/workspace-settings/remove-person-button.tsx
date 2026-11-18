"use client"

import { useState, useTransition } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { useRouter } from "next/navigation"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import {
  removeTenantPersonFromCooperativeAction,
  restoreTenantPersonAction,
} from "@/lib/dashboard-actions"

/**
 * "Remove from cooperative": takes all of a staff person's roles away at
 * once (a person's last role can't be removed on its own). Their account
 * and history stay, and an admin can restore them.
 */
export function RemovePersonButton({
  name,
  userId,
}: {
  name: string
  userId: string
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function remove() {
    const formData = new FormData()
    formData.set("userId", userId)

    startTransition(async () => {
      try {
        await removeTenantPersonFromCooperativeAction(formData)
        showSuccess(
          "Removed from cooperative",
          `${name} can't sign in here any more. You can restore them below.`
        )
        setOpen(false)
        router.refresh()
      } catch (error) {
        showError(
          "Could not remove",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <Button
        size="touch"
        aria-label={`Remove ${name} from the cooperative`}
        className="w-full text-base sm:w-auto"
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        Remove from cooperative
      </Button>
      <ConfirmActionDialog
        actionLabel="Remove from cooperative"
        description={`${name} won't be able to sign in to this cooperative. Their account and history stay, and other cooperatives they belong to aren't affected. You can restore them later.`}
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={remove}
        open={open}
        pending={pending}
        title={`Remove ${name} from the cooperative?`}
      />
    </>
  )
}

/** Gives a removed person back the roles they had. */
export function RestorePersonButton({
  name,
  removalId,
}: {
  name: string
  removalId: string
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      size="touch"
      aria-label={`Restore ${name}`}
      className="w-full text-base sm:w-auto"
      disabled={pending}
      onClick={() => {
        const formData = new FormData()
        formData.set("removalId", removalId)

        startTransition(async () => {
          try {
            await restoreTenantPersonAction(formData)
            showSuccess("Restored", `${name} can sign in again.`)
            router.refresh()
          } catch (error) {
            showError(
              "Could not restore",
              error instanceof Error ? error.message : "Something went wrong."
            )
          }
        })
      }}
      type="button"
      variant="outline"
    >
      {pending ? "Restoring…" : "Restore"}
    </Button>
  )
}
