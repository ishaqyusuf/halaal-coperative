"use client"

import { useState, useTransition } from "react"
import type { MembershipRole } from "@halaalvest/db"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { useRouter } from "next/navigation"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import { removeTenantStaffRoleAction } from "@/lib/dashboard-actions"
import { getRemoveRoleEffect, getRoleWord } from "@/lib/settings/role-words"

/** "Remove" on one of a person's roles, confirmed in an AlertDialog. */
export function RemoveRoleButton({
  membershipId,
  name,
  otherRoles,
  role,
}: {
  membershipId: string
  name: string
  otherRoles: MembershipRole[]
  role: MembershipRole
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const roleWord = getRoleWord(role).toLowerCase()

  function remove() {
    const formData = new FormData()
    formData.set("membershipId", membershipId)
    formData.set("role", role)

    startTransition(async () => {
      try {
        await removeTenantStaffRoleAction(formData)
        showSuccess("Role removed", `${name} is no longer a ${roleWord}.`)
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
        aria-label={`Remove ${roleWord} from ${name}`}
        className="text-base"
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        Remove
      </Button>
      <ConfirmActionDialog
        actionLabel="Remove role"
        description={getRemoveRoleEffect({ name, otherRoles, role })}
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={remove}
        open={open}
        pending={pending}
        title={`Remove ${roleWord} from ${name}?`}
      />
    </>
  )
}
