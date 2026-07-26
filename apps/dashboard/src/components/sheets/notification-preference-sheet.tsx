"use client"

import { Suspense } from "react"
import { NotificationPreferenceContent } from "@/components/notification-preference-content"
import { NotificationPreferenceSheetHeader } from "@/components/notification-preference-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useNotificationPreferenceParams } from "@/hooks/use-notification-preference-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export function NotificationPreferenceSheet() {
  const {
    notificationPreferenceType,
    setParams,
  } = useNotificationPreferenceParams()
  const isOpen = Boolean(notificationPreferenceType)

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("notificationPreference", "edit")}
      open={isOpen}
      onOpenChange={handleOnOpenChange}
    >
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading notification preference...
              </div>
            }
          >
            <NotificationPreferenceSheetHeader />
            <NotificationPreferenceContent />
          </Suspense>
        ) : null}
    </WorkflowPresentation>
  )
}
