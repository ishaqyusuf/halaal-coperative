"use client"

import { useNotifications } from "@halaalvest/notifications-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { useMarkWorkflowSaved } from "@/components/workflow-presentation"

/**
 * Saves a Finance setup form: runs the action, says so plainly, marks the
 * overlay saved, then closes it and refreshes the page's figures.
 */
export function useFinanceSettingsSave({
  onDone,
  successTitle,
}: {
  onDone?: () => Promise<unknown> | void
  successTitle: string
}) {
  const router = useRouter()
  const markWorkflowSaved = useMarkWorkflowSaved()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function save(action: () => Promise<unknown>, after?: () => void) {
    startTransition(async () => {
      try {
        await action()
        markWorkflowSaved()
        showSuccess(successTitle)
        after?.()
        await onDone?.()
        router.refresh()
      } catch (error) {
        showError(
          "Not saved",
          error instanceof Error ? error.message : "Please try again."
        )
      }
    })
  }

  return { isPending, save }
}
