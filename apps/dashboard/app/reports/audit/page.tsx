import { listAuditLogs } from "@halaal-vest/db"
import { AuditFilterForm } from "@/features/forms/misc-forms"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"
import { getReportsDateFilters } from "../export-utils"

export default async function AuditViewerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const context = await getDashboardServerContext()

  if (!context.tenant || !hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)) {
    return (
      <WorkspacePageShell
        eyebrow="Reports"
        title="Audit viewer"
        description="Detailed audit activity is available to workspace admin roles."
      >
        <WorkspaceEmptyState
          title="Audit viewer unavailable."
          body="This route is limited to admin roles in a configured tenant workspace."
        />
      </WorkspacePageShell>
    )
  }

  const filters = getReportsDateFilters(params)
  const search = typeof params.search === "string" ? params.search : ""
  const action = typeof params.action === "string" ? params.action : ""
  const logs = await listAuditLogs(context.tenant.id, {
    action: action || undefined,
    fromDate: filters.fromDate,
    limit: 200,
    search: search || undefined,
    toDate: filters.toDate,
  })

  return (
    <WorkspacePageShell
      eyebrow="Reports"
      title="Audit viewer"
      description="Search actor activity, entity changes, and operational events with a wider time window than the overview card."
    >
      <AuditFilterForm
        defaultValues={{
          action,
          from: filters.from,
          search,
          to: filters.to,
        }}
        devMode={process.env.NODE_ENV !== "production"}
      />

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Audit events</h3>
        </div>
        <div className="divide-y divide-border/60">
          {logs.map((log) => (
            <article key={log.id} className="px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{log.action}</p>
                  <p className="text-sm text-muted-foreground">
                    {log.actorUser?.fullName ?? log.actorType} · {log.entityType} · {log.entityId ?? "n/a"}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">{log.occurredAt.toISOString()}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </WorkspacePageShell>
  )
}
