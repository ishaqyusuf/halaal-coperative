"use client"

import { Suspense } from "react"
import { NotificationPreferenceSheetHeader } from "@/components/notification-preference-sheet-header"
import { EmailSettingsContent } from "@/components/notifications/email-settings-content"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useNotificationPreferenceParams } from "@/hooks/use-notification-preference-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

/** Staff email settings, opened by `?emailSettings=true` from /notifications. */
export function NotificationPreferenceSheet() {
  const { emailSettings, setParams } = useNotificationPreferenceParams()
  const isOpen = emailSettings === true

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("notificationPreference", "settings")}
      open={isOpen}
      onOpenChange={handleOnOpenChange}
    >
      {isOpen ? (
        <>
          <NotificationPreferenceSheetHeader />
          <Suspense
            fallback={
              <p className="px-6 text-base text-muted-foreground">Loading…</p>
            }
          >
            <EmailSettingsContent />
          </Suspense>
        </>
      ) : null}
    </WorkflowPresentation>
  )
}
