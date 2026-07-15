"use client"

import { Suspense } from "react"
import { NotificationPreferenceContent } from "@/components/notification-preference-content"
import { NotificationPreferenceSheetHeader } from "@/components/notification-preference-sheet-header"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { useNotificationPreferenceParams } from "@/hooks/use-notification-preference-params"

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
    <Sheet open={isOpen} onOpenChange={handleOnOpenChange}>
      <SheetContent>
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
      </SheetContent>
    </Sheet>
  )
}
