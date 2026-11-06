"use client"

import type { ReactNode } from "react"
import { useInitialMigrationParams } from "@/hooks/use-initial-migration-params"
import { useMemberBackfillParams } from "@/hooks/use-member-backfill-params"

type FormAction = (formData: FormData) => Promise<unknown>

// Forms inside URL-driven backfill and migration overlays. They clear the
// overlay's params after a successful submit, since an alert dialog's backdrop
// offers no way out; a failed action throws to the route error boundary.
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

  return (
    <form
      action={async (formData) => {
        await action(formData)
        await setParams({
          memberBackfillMonth: null,
          memberBackfillSheetType: null,
          memberBackfillTargetId: null,
        })
      }}
      className={className}
    >
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

  return (
    <form
      action={async (formData) => {
        await action(formData)
        await setParams({
          initialMigrationSheetType: null,
          legacyLoanDraftId: null,
        })
      }}
      className={className}
    >
      {children}
    </form>
  )
}
