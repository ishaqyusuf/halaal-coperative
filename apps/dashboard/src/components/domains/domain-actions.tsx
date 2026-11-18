"use client"

import { useState, useTransition } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { useRouter } from "next/navigation"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import { useDomainParams } from "@/hooks/use-domain-params"
import {
  removeTenantCustomDomainAction,
  runTenantDomainVerificationCheckAction,
} from "@/lib/dashboard-actions"

function domainForm(domainId: string) {
  const formData = new FormData()
  formData.set("domainId", domainId)
  return formData
}

/** Looks the address up again and saves whether it points to us. */
export function CheckDomainButton({
  domainId,
  hostname,
}: {
  domainId: string
  hostname: string
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      size="touch"
      aria-label={`Check ${hostname} now`}
      className="text-base"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await runTenantDomainVerificationCheckAction(domainForm(domainId))
            showSuccess("Checked", `${hostname} was checked.`)
            router.refresh()
          } catch (error) {
            showError(
              "Could not check",
              error instanceof Error ? error.message : "Something went wrong."
            )
          }
        })
      }
      type="button"
      variant="outline"
    >
      {pending ? "Checking…" : "Check now"}
    </Button>
  )
}

/** Removes one of the cooperative's own extra addresses, after an AlertDialog. */
export function RemoveDomainButton({
  domainId,
  hostname,
}: {
  domainId: string
  hostname: string
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      try {
        await removeTenantCustomDomainAction(domainForm(domainId))
        showSuccess("Address removed", `${hostname} no longer opens your site.`)
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
        aria-label={`Remove ${hostname}`}
        className="text-base"
        onClick={() => setOpen(true)}
        type="button"
        variant="ghost"
      >
        Remove
      </Button>
      <ConfirmActionDialog
        actionLabel="Remove address"
        description={`Members can no longer open your cooperative at ${hostname}. Your Halaalvest address keeps working. You can add it again later.`}
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={remove}
        open={open}
        pending={pending}
        title={`Remove ${hostname}?`}
      />
    </>
  )
}

export function OpenAddDomainButton() {
  const { setParams } = useDomainParams()

  return (
    <Button
      size="touch"
      className="w-full text-base sm:w-auto"
      onClick={() => setParams({ domainDialog: "add" })}
      type="button"
    >
      Add your own address
    </Button>
  )
}
