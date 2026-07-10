import { getAuditFilterMetadata, listActivityReportEvents } from "@halaalvest/db"
import { AuditHeader } from "@/components/audit-header"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, DashboardSurfaceCard, TrendPill, WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { loadAuditFilterParams } from "@/hooks/use-audit-filter-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"
import { getReportsDateFilters } from "../export-utils"

export default async function AuditViewerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = loadAuditFilterParams(await searchParams)
  const context = await getDashboardServerContext()

  if (!context.tenant || !hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)) {
    return (
      <WorkspacePageShell eyebrow="Reports" title="Activity report" description="Detailed activity evidence is available to workspace admin roles.">
        <WorkspaceEmptyState title="Activity report unavailable." body="This route is limited to admin roles in a configured cooperative workspace." />
      </WorkspacePageShell>
    )
  }

  const filters = getReportsDateFilters({
    from: params.from ?? undefined,
    to: params.to ?? undefined,
  })
  const search = params.search ?? ""
  const action = params.action ?? ""
  const [filterList, logs] = await Promise.all([
    getAuditFilterMetadata(context.tenant.id),
    listActivityReportEvents(context.tenant.id, {
      action: action || undefined,
      fromDate: filters.fromDate,
      limit: 200,
      search: search || undefined,
      toDate: filters.toDate,
    }),
  ])

  return (
    <WorkspacePageShell eyebrow="Reports" title="Activity report" description="Search actor activity, authorizer evidence, entity changes, and operational events with a wider time window than the reports overview card.">
      <AuditHeader filterList={filterList} />

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard label="Events loaded" value={logs.length.toString()} detail="Audit events returned for the current filter set." />
        <DashboardStatCard label="User-originated" value={logs.filter((log) => log.actorType === "user").length.toString()} detail="Actions performed by a user actor." />
        <DashboardStatCard label="System/integration" value={logs.filter((log) => log.actorType !== "user").length.toString()} detail="Automated or system-generated events." />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Audit events" title="Detailed activity stream" actions={<TrendPill>{logs.length} events</TrendPill>} />
        <div className="mt-5 space-y-3">
          {logs.map((log) => (
            <DashboardSurfaceCard key={log.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{log.actionLabel}</p>
                  <p className="text-sm text-muted-foreground">{log.actorLabel} · {log.entityType} · {log.entityId ?? "n/a"}</p>
                </div>
                <p className="text-sm text-muted-foreground">{log.occurredAt.toISOString()}</p>
              </div>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Performed by</p>
                  <p className="mt-1 text-foreground">{log.actorLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{log.authorizationRole}</p>
                  <p className="mt-1 text-foreground">{log.authorizerLabel}</p>
                </div>
              </div>
              {log.metadataSummary.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {log.metadataSummary.map((item) => (
                    <span className="border border-border bg-background px-2 py-1 text-xs text-muted-foreground" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </DashboardSurfaceCard>
          ))}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
