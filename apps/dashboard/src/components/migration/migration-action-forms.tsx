"use client"

import { useNotifications } from "@halaalvest/notifications-react"
import type { ReactNode } from "react"
import { useInitialMigrationParams } from "@/hooks/use-initial-migration-params"
import { useMemberBackfillParams } from "@/hooks/use-member-backfill-params"

type FormAction = (formData: FormData) => Promise<unknown>

// Forms inside URL-driven backfill and migration overlays. They clear the
// overlay's params after a successful submit, since an alert dialog's backdrop
// offers no way out. A refused action (a mistyped phrase, a closed step) keeps
// the overlay open and says why, instead of replacing the page with an error.
function useOverlayFormAction(
  action: FormAction,
  close: () => Promise<unknown>
) {
  const { showError } = useNotifications()

  return async (formData: FormData) => {
    try {
      await action(formData)
    } catch (error) {
      showError(
        "Not saved",
        error instanceof Error && error.message
          ? error.message
          : "Something went wrong. Nothing was changed."
      )
      return
    }
    await close()
  }
}

export function MemberBackfillActionForm({
  action,
  children,
  className,
}: {
  action: FormAction
  children: ReactNode
  className?: string
}) {
  const { setParams } = useMemberBackfillParams()
  const submit = useOverlayFormAction(action, () =>
    setParams({
      memberBackfillMonth: null,
      memberBackfillSheetType: null,
      memberBackfillTargetId: null,
    })
  )

  return (
    <form action={submit} className={className}>
      {children}
    </form>
  )
}

export function InitialMigrationActionForm({
  action,
  children,
  className,
}: {
  action: FormAction
  children: ReactNode
  className?: string
}) {
  const { setParams } = useInitialMigrationParams()
  const submit = useOverlayFormAction(action, () =>
    setParams({
      initialMigrationSheetType: null,
      legacyLoanDraftId: null,
    })
  )

  return (
    <form action={submit} className={className}>
      {children}
    </form>
  )
}
