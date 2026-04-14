import { cooperativeRoles, getRoleDisplayName } from "@halaal-vest/auth"
import { createDbRuntime, listNotificationOutboxEntries, listNotificationPreferences } from "@halaal-vest/db"
import { Button } from "@halaal-vest/ui/components/button"
import { createNotificationFromType, platformNotificationTypes } from "@halaal-vest/notifications"
import { NotificationFilterForm } from "@/features/forms/misc-forms"
import { WorkspacePageShell } from "@/features/workspace/page-shell"
import { saveNotificationPreferenceAction } from "@/lib/dashboard-actions"
import { getDashboardServerContext } from "@/lib/server-context"

const managedNotificationTypes = [
  "workspace_invitation",
  "loan_approval_required",
  "charge.applied",
  "charge.waived",
  "charge.reversed",
  "repayment.posted",
  "domain.verification_changed",
  "domain.verification_checked",
  "collections.follow_up_recorded",
  "member.status_changed",
  "member.kyc_updated",
] as const

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await getDashboardServerContext()
  const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
  const runtime = createDbRuntime()
  const search = typeof params.search === "string" ? params.search : ""
  const status = typeof params.status === "string" ? params.status : ""
  const type = typeof params.type === "string" ? params.type : ""

  const notifications = [
    createNotificationFromType(platformNotificationTypes, "workspace_invitation", {
      recipientName: context.auth.user?.fullName ?? "Cooperative User",
      tenantName,
    }),
    createNotificationFromType(platformNotificationTypes, "loan_approval_required", {
      amount: 250000,
      memberName: "Amina Yusuf",
    }),
  ]

  const outboxEntries =
    context.tenant && runtime.status === "database-configured"
      ? await listNotificationOutboxEntries(context.tenant.id, {
          limit: 25,
          notificationType: type || undefined,
          search: search || undefined,
          status: status === "queued" || status === "sent" || status === "failed" ? status : undefined,
        })
      : []
  const preferences =
    context.tenant && runtime.status === "database-configured"
      ? await listNotificationPreferences(context.tenant.id)
      : []
  const roleOptions: Array<(typeof cooperativeRoles)[number] | "all"> = ["all", ...cooperativeRoles]
  const notificationTypeCounts = Array.from(
    outboxEntries.reduce((map, entry) => {
      map.set(entry.notificationType, (map.get(entry.notificationType) ?? 0) + 1)
      return map
    }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const failureReasons = Array.from(
    outboxEntries
      .filter((entry) => entry.status === "failed")
      .reduce((map, entry) => {
        const key = entry.errorMessage ?? "Unknown failure"
        map.set(key, (map.get(key) ?? 0) + 1)
        return map
      }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]).slice(0, 3)
  const sourceCounts = Array.from(
    outboxEntries.reduce((map, entry) => {
      map.set(entry.source, (map.get(entry.source) ?? 0) + 1)
      return map
    }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const preferenceKeys = new Set(
    preferences
      .filter((preference) => preference.enabled)
      .map((preference) => `${preference.role ?? "all"}:${preference.notificationType}:${preference.channel}`),
  )

  return (
    <WorkspacePageShell
      eyebrow="Notifications"
      title="Notifications"
      description="Review tenant delivery history and keep shared notification templates aligned with the role-aware workspace."
    >
      <NotificationFilterForm
        defaultValues={{ search, status, type }}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Queued or sent</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{outboxEntries.length}</p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Delivered</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {outboxEntries.filter((entry) => entry.status === "sent").length}
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Failed</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {outboxEntries.filter((entry) => entry.status === "failed").length}
          </p>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Top notification types</h3>
          <div className="mt-4 space-y-3">
            {notificationTypeCounts.length ? notificationTypeCounts.map(([notificationType, count]) => (
              <div key={notificationType} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{notificationType}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No notification traffic yet.</p>}
          </div>
        </article>
        <article className="rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Top failure reasons</h3>
          <div className="mt-4 space-y-3">
            {failureReasons.length ? failureReasons.map(([reason, count]) => (
              <div key={reason} className="flex items-start justify-between gap-4 text-sm">
                <span className="text-foreground">{reason}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No delivery failures in the current view.</p>}
          </div>
        </article>
        <article className="rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Top sources</h3>
          <div className="mt-4 space-y-3">
            {sourceCounts.length ? sourceCounts.map(([source, count]) => (
              <div key={source} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{source}</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No source data yet.</p>}
          </div>
        </article>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Tenant notification preferences</h3>
        </div>
        <div className="space-y-4 px-4 py-4">
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
                      <Button size="xs" type="submit" variant={enabled ? "default" : "outline"}>
                        {role ? getRoleDisplayName(role) : "All roles"} {enabled ? "on" : "off"}
                      </Button>
                    </form>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Recent delivery history</h3>
        </div>
        <div className="divide-y divide-border/60">
          {outboxEntries.length > 0 ? (
            outboxEntries.map((entry) => (
              <article key={entry.id} className="px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{entry.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.recipient} · {entry.notificationType}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {entry.status} · {entry.createdAt.toISOString().slice(0, 10)}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <article className="px-4 py-4 text-sm text-muted-foreground">
              No persisted delivery history yet. Shared notification previews remain available below.
            </article>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {notifications.map((notification) => (
          <article
            key={notification.notificationType ?? notification.title}
            className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {notification.notificationType ?? notification.variant}
            </p>
            <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">{notification.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{notification.description}</p>
          </article>
        ))}
      </div>
    </WorkspacePageShell>
  )
}
