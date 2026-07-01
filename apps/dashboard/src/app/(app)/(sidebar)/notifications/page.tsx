import { cooperativeRoles, getRoleDisplayName } from "@halaalvest/auth/roles"
import {
  createDbRuntime,
  getNotificationFilterMetadata,
  getNotificationOutboxSummary,
  listNotificationOutboxEntries,
  listNotificationPreferences,
} from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { halaalVestNotificationTypeList } from "@halaalvest/notifications"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, DashboardSurfaceCard, TrendPill, WorkspacePageShell } from "@/components/dashboard"
import { NotificationsHeader } from "@/components/notifications-header"
import { loadNotificationsFilterParams } from "@/hooks/use-notifications-filter-params"
import { saveNotificationPreferenceAction } from "@/lib/dashboard-actions"
import { getDashboardServerContext } from "@/lib/server-context"

const managedNotificationTypes = halaalVestNotificationTypeList

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = loadNotificationsFilterParams(await searchParams)
  const context = await getDashboardServerContext()
  const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
  const runtime = createDbRuntime()
  const search = filters.search ?? ""
  const status = filters.status ?? ""
  const type = filters.type ?? ""

  const [filterList, outboxEntries, preferences, outboxSummary] = await Promise.all([
    context.tenant ? getNotificationFilterMetadata(context.tenant.id) : Promise.resolve([]),
    context.tenant && runtime.status === "database-configured"
      ? listNotificationOutboxEntries(context.tenant.id, { limit: 25, notificationType: type || undefined, search: search || undefined, status: status === "queued" || status === "sent" || status === "failed" ? status : undefined })
      : Promise.resolve([]),
    context.tenant && runtime.status === "database-configured" ? listNotificationPreferences(context.tenant.id) : Promise.resolve([]),
    context.tenant && runtime.status === "database-configured" ? getNotificationOutboxSummary(context.tenant.id) : Promise.resolve({ failedCount: 0, lastSentAt: null, queuedCount: 0, sentCount: 0 }),
  ])
  const roleOptions: Array<(typeof cooperativeRoles)[number] | "all"> = ["all", ...cooperativeRoles]
  const preferenceKeys = new Set(preferences.filter((preference) => preference.enabled).map((preference) => `${preference.role ?? "all"}:${preference.notificationType}:${preference.channel}`))
  const notificationTypeCounts = Array.from(outboxEntries.reduce((map, entry) => map.set(entry.notificationType, (map.get(entry.notificationType) ?? 0) + 1), new Map<string, number>())).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const failureReasons = Array.from(outboxEntries.filter((entry) => entry.status === "failed").reduce((map, entry) => map.set(entry.errorMessage ?? "Unknown failure", (map.get(entry.errorMessage ?? "Unknown failure") ?? 0) + 1), new Map<string, number>())).sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <WorkspacePageShell eyebrow="Notifications" title="Notifications" description="Review cooperative delivery history, preference toggles, and shared notification previews in one support-friendly workspace.">
      <NotificationsHeader filterList={filterList} />

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard label="Queued" value={outboxSummary.queuedCount.toString()} detail="Notifications waiting for the delivery worker." />
        <DashboardStatCard label="Delivered" value={outboxSummary.sentCount.toString()} detail={outboxSummary.lastSentAt ? `Last sent ${outboxSummary.lastSentAt.toISOString().slice(0, 10)}.` : "Persisted sent notification entries."} tone="positive" />
        <DashboardStatCard label="Failed" value={outboxSummary.failedCount.toString()} detail="Delivery failures requiring support follow-up." tone={outboxSummary.failedCount > 0 ? "warning" : "default"} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Types" title="Top notification types" />
          <div className="mt-5 space-y-3">{notificationTypeCounts.length ? notificationTypeCounts.map(([notificationType, count]) => <div key={notificationType} className="flex items-center justify-between text-sm"><span>{notificationType}</span><span className="text-muted-foreground">{count}</span></div>) : <p className="text-sm text-muted-foreground">No notification traffic yet.</p>}</div>
        </DashboardSectionCard>
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Failures" title="Top failure reasons" />
          <div className="mt-5 space-y-3">{failureReasons.length ? failureReasons.map(([reason, count]) => <div key={reason} className="flex items-start justify-between gap-4 text-sm"><span>{reason}</span><span className="text-muted-foreground">{count}</span></div>) : <p className="text-sm text-muted-foreground">No delivery failures in the current view.</p>}</div>
        </DashboardSectionCard>
        <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Coverage" title="Registry coverage" />
          <div className="mt-5 space-y-3">{managedNotificationTypes.slice(0, 6).map((notificationType) => <DashboardSurfaceCard key={notificationType}><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">registered</p><h3 className="mt-2 text-sm font-medium text-foreground">{notificationType}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Available for preferences, outbox history, and delivery worker routing.</p></DashboardSurfaceCard>)}</div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Preferences" title="Cooperative notification preferences" description="Toggle email routing by notification type and cooperative role without leaving the dashboard." />
        <div className="mt-5 space-y-4">
          {managedNotificationTypes.map((notificationType) => (
            <div key={notificationType} className="space-y-3">
              <p className="text-sm font-medium text-foreground">{notificationType}</p>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map((roleKey) => {
                  const role = roleKey === "all" ? null : roleKey
                  const enabled = preferenceKeys.has(`${role ?? "all"}:${notificationType}:email`)
                  return (
                    <form key={`${notificationType}-${roleKey}`} action={saveNotificationPreferenceAction}>
                      <input type="hidden" name="notificationType" value={notificationType} />
                      <input type="hidden" name="channel" value="email" />
                      <input type="hidden" name="role" value={role ?? ""} />
                      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
                      <Button size="xs" type="submit" variant={enabled ? "default" : "outline"} className="rounded-full">
                        {role ? getRoleDisplayName(role) : "All roles"} {enabled ? "on" : "off"}
                      </Button>
                    </form>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="History" title="Recent delivery history" actions={<TrendPill>{outboxEntries.length} entries</TrendPill>} />
        <div className="mt-5 space-y-3">
          {outboxEntries.length > 0 ? outboxEntries.map((entry) => (
            <DashboardSurfaceCard key={entry.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{entry.subject}</p>
                  <p className="text-sm text-muted-foreground">{entry.recipient} · {entry.notificationType}</p>
                </div>
                <TrendPill tone={entry.status === "sent" ? "positive" : entry.status === "failed" ? "warning" : "neutral"}>{entry.status} · {entry.createdAt.toISOString().slice(0, 10)}</TrendPill>
              </div>
            </DashboardSurfaceCard>
          )) : <p className="text-sm text-muted-foreground">No persisted delivery history yet. Shared notification previews remain available above.</p>}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
