import type { PageFilterData } from "@halaalvest/utils"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
  WorkspacePageShell,
} from "@/components/dashboard"
import { NotificationColumnVisibility } from "@/components/notification-column-visibility"
import { NotificationsHeader } from "@/components/notifications-header"
import { OpenNotificationPreferenceSheet } from "@/components/open-notification-preference-sheet"
import { NotificationsDataTable } from "@/components/tables/notifications/data-table"
import type { TableSettings } from "@/utils/table-settings"

type NotificationPreferenceToggle = {
  enabled: boolean
  label: string
  notificationType: string
  role: string | null
}

type NotificationsViewProps = {
  failedCount: number
  failureReasons: Array<[string, number]>
  filterList: PageFilterData[]
  initialTableSettings: Partial<TableSettings>
  lastSentDateLabel: string | null
  managedNotificationTypes: string[]
  notificationTypeCounts: Array<[string, number]>
  preferenceToggles: NotificationPreferenceToggle[]
  preparedCount: number
  sentCount: number
  totalEntries: number
}

export function NotificationsView({
  failedCount,
  failureReasons,
  filterList,
  initialTableSettings,
  lastSentDateLabel,
  managedNotificationTypes,
  notificationTypeCounts,
  preferenceToggles,
  preparedCount,
  sentCount,
  totalEntries,
}: NotificationsViewProps) {
  return (
    <WorkspacePageShell
      description="Review cooperative delivery history, preference toggles, and shared notification previews in one support-friendly workspace."
      eyebrow="Notifications"
      title="Notifications"
    >
      <NotificationsHeader filterList={filterList} />

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard
          detail="Emails prepared without a configured provider."
          label="Prepared"
          value={preparedCount.toString()}
        />
        <DashboardStatCard
          detail={
            lastSentDateLabel
              ? `Last sent ${lastSentDateLabel}.`
              : "Directly sent notification emails."
          }
          label="Sent"
          tone="positive"
          value={sentCount.toString()}
        />
        <DashboardStatCard
          detail="Direct delivery failures requiring support follow-up."
          label="Failed"
          tone={failedCount > 0 ? "warning" : "default"}
          value={failedCount.toString()}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Types"
            title="Top notification types"
          />
          <div className="mt-5 space-y-3">
            {notificationTypeCounts.length ? (
              notificationTypeCounts.map(([notificationType, count]) => (
                <div
                  className="flex items-center justify-between text-sm"
                  key={notificationType}
                >
                  <span>{notificationType}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No notification traffic yet.
              </p>
            )}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Failures"
            title="Top failure reasons"
          />
          <div className="mt-5 space-y-3">
            {failureReasons.length ? (
              failureReasons.map(([reason, count]) => (
                <div
                  className="flex items-start justify-between gap-4 text-sm"
                  key={reason}
                >
                  <span>{reason}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No delivery failures in the current view.
              </p>
            )}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Coverage" title="Registry coverage" />
          <div className="mt-5 space-y-3">
            {managedNotificationTypes.slice(0, 6).map((notificationType) => (
              <DashboardSurfaceCard key={notificationType}>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  registered
                </p>
                <h3 className="mt-2 text-sm font-medium text-foreground">
                  {notificationType}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Available for preferences, direct delivery, and audit history.
                </p>
              </DashboardSurfaceCard>
            ))}
          </div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          description="Toggle email routing by notification type and cooperative role without leaving the dashboard."
          eyebrow="Preferences"
          title="Cooperative notification preferences"
        />
        <div className="mt-5 space-y-4">
          {managedNotificationTypes.map((notificationType) => (
            <div className="space-y-3" key={notificationType}>
              <p className="text-sm font-medium text-foreground">
                {notificationType}
              </p>
              <div className="flex flex-wrap gap-2">
                {preferenceToggles
                  .filter((toggle) => toggle.notificationType === notificationType)
                  .map((toggle) => (
                    <OpenNotificationPreferenceSheet
                      enabled={toggle.enabled}
                      key={`${toggle.notificationType}-${toggle.role ?? "all"}`}
                      label={toggle.label}
                      notificationType={toggle.notificationType}
                      role={toggle.role}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <div className="flex items-center gap-2">
              <NotificationColumnVisibility />
              <TrendPill>{totalEntries} entries</TrendPill>
            </div>
          }
          eyebrow="History"
          title="Recent delivery history"
        />
        <div className="mt-5">
          <NotificationsDataTable initialSettings={initialTableSettings} />
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
