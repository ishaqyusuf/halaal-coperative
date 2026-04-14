import { cooperativeRoles, getRoleDisplayName } from "@halaal-vest/auth"
import { createDbRuntime, listNotificationOutboxEntries, listNotificationPreferences } from "@halaal-vest/db"
import { Button } from "@halaal-vest/ui/components/button"
import { createNotificationFromType, platformNotificationTypes } from "@halaal-vest/notifications"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, TrendPill } from "@/components/dashboard/primitives"
import { NotificationFilterForm } from "@/features/forms/misc-forms"
import { WorkspacePageShell } from "@/features/workspace/page-shell"
import { saveNotificationPreferenceAction } from "@/lib/dashboard-actions"
import { getDashboardServerContext } from "@/lib/server-context"

const managedNotificationTypes = ["workspace_invitation", "loan_approval_required", "charge.applied", "charge.waived", "charge.reversed", "repayment.posted", "domain.verification_changed", "domain.verification_checked", "collections.follow_up_recorded", "member.status_changed", "member.kyc_updated"] as const

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const context = await getDashboardServerContext()
  const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
  const runtime = createDbRuntime()
  const search = typeof params.search === "string" ? params.search : ""
  const status = typeof params.status === "string" ? params.status : ""
  const type = typeof params.type === "string" ? params.type : ""

  const notifications = [
    createNotificationFromType(platformNotificationTypes, "workspace_invitation", { recipientName: context.auth.user?.fullName ?? "Cooperative User", tenantName }),
    createNotificationFromType(platformNotificationTypes, "loan_approval_required", { amount: 250000, memberName: "Amina Yusuf" }),
  ]

  const outboxEntries = context.tenant && runtime.status === "database-configured"
    ? await listNotificationOutboxEntries(context.tenant.id, { limit: 25, notificationType: type || undefined, search: search || undefined, status: status === "queued" || status === "sent" || status === "failed" ? status : undefined })
    : []
  const preferences = context.tenant && runtime.status === "database-configured" ? await listNotificationPreferences(context.tenant.id) : []
  const roleOptions: Array<(typeof cooperativeRoles)[number] | "all"> = ["all", ...cooperativeRoles]
  const preferenceKeys = new Set(preferences.filter((preference) => preference.enabled).map((preference) => `${preference.role ?? "all"}:${preference.notificationType}:${preference.channel}`))
  const notificationTypeCounts = Array.from(outboxEntries.reduce((map, entry) => map.set(entry.notificationType, (map.get(entry.notificationType) ?? 0) + 1), new Map<string, number>())).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const failureReasons = Array.from(outboxEntries.filter((entry) => entry.status === "failed").reduce((map, entry) => map.set(entry.errorMessage ?? "Unknown failure", (map.get(entry.errorMessage ?? "Unknown failure") ?? 0) + 1), new Map<string, number>())).sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <WorkspacePageShell eyebrow="Notifications" title="Notifications" description="Review tenant delivery history, preference toggles, and shared notification previews in one support-friendly workspace.">
      <NotificationFilterForm defaultValues={{ search, status, type }} />

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard label="Queued or sent" value={outboxEntries.length.toString()} detail="Notification entries loaded in the current outbox filter." />
        <DashboardStatCard label="Delivered" value={outboxEntries.filter((entry) => entry.status === "sent").length.toString()} detail="Persisted sent events in the current view." tone="positive" />
        <DashboardStatCard label="Failed" value={outboxEntries.filter((entry) => entry.status === "failed").length.toString()} detail="Delivery failures requiring support follow-up." tone={outboxEntries.some((entry) => entry.status === "failed") ? "warning" : "default"} />
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
          <DashboardSectionHeader eyebrow="Preview" title="Template coverage" />
          <div className="mt-5 space-y-3">{notifications.map((notification) => <div key={notification.notificationType ?? notification.title} className="rounded-2xl border border-border/70 bg-muted/25 p-4"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{notification.notificationType ?? notification.variant}</p><h3 className="mt-2 text-sm font-medium text-foreground">{notification.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{notification.description}</p></div>)}</div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Preferences" title="Tenant notification preferences" description="Toggle email routing by notification type and cooperative role without leaving the dashboard." />
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
            <div key={entry.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{entry.subject}</p>
                  <p className="text-sm text-muted-foreground">{entry.recipient} · {entry.notificationType}</p>
                </div>
                <TrendPill tone={entry.status === "sent" ? "positive" : entry.status === "failed" ? "warning" : "neutral"}>{entry.status} · {entry.createdAt.toISOString().slice(0, 10)}</TrendPill>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No persisted delivery history yet. Shared notification previews remain available above.</p>}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
