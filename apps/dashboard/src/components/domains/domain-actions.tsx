"use client"

import { useState, useTransition } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { useRouter } from "next/navigation"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import { useDomainParams } from "@/hooks/use-domain-params"
import {
  runTenantDomainVerificationCheckAction,
  setTenantDomainPrimaryAction,
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
      aria-label={`Check ${hostname} now`}
      className="h-11 text-base"
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

/** Makes a ready address the main one, after an AlertDialog. */
export function MakeMainDomainButton({
  currentMain,
  domainId,
  hostname,
}: {
  currentMain: string | null
  domainId: string
  hostname: string
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function makeMain() {
    startTransition(async () => {
      try {
        await setTenantDomainPrimaryAction(domainForm(domainId))
        showSuccess("Main address changed", `${hostname} is now your main address.`)
        setOpen(false)
        router.refresh()
      } catch (error) {
        showError(
          "Could not change",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <Button
        aria-label={`Make ${hostname} the main address`}
        className="h-11 text-base"
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        Make main address
      </Button>
      <ConfirmActionDialog
        actionLabel="Make main address"
        description={`${hostname} will be shown as your cooperative's web address.${
          currentMain ? ` ${currentMain} keeps working.` : ""
        } Open https://${hostname} first to check it loads your site.`}
        onCancel={() => setOpen(false)}
        onConfirm={makeMain}
        open={open}
        pending={pending}
        title={`Make ${hostname} your main address?`}
      />
    </>
  )
}

export function OpenAddDomainButton() {
  const { setParams } = useDomainParams()

  return (
    <Button
      className="h-11 w-full text-base sm:w-auto"
      onClick={() => setParams({ domainDialog: "add" })}
      type="button"
    >
      Add your own address
    </Button>
  )
}
