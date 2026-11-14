"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Settings } from "lucide-react"
import { Suspense } from "react"
import { DashboardPageHeader } from "@/components/dashboard"
import {
  NotificationList,
  NotificationListSkeleton,
} from "@/components/notifications/notification-list"
import { NotificationSearch } from "@/components/notifications/notification-search"
import { NotificationSummary } from "@/components/notifications/notification-summary"
import { SummaryCardSkeleton } from "@/components/summary-card"
import { useNotificationPreferenceParams } from "@/hooks/use-notification-preference-params"

export function NotificationsView({
  canManageEmailSettings,
  isMember,
}: {
  canManageEmailSettings: boolean
  isMember: boolean
}) {
  const { setParams } = useNotificationPreferenceParams()

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageHeader
        actions={
          canManageEmailSettings ? (
            <Button
              onClick={() => setParams({ emailSettings: true })}
              variant="outline"
            >
              <Settings aria-hidden="true" className="size-5" />
              Email settings
            </Button>
          ) : null
        }
        description={
          isMember
            ? "Emails the cooperative has sent you."
            : "Emails the cooperative has sent to members and staff."
        }
        title="Notifications"
      />

      <Suspense
        fallback={
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </div>
        }
      >
        <NotificationSummary />
      </Suspense>

      {isMember ? null : <NotificationSearch />}

      <Suspense fallback={<NotificationListSkeleton />}>
        <NotificationList showRecipient={!isMember} />
      </Suspense>
    </div>
  )
}
