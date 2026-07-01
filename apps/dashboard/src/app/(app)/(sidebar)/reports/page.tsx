import { createDbRuntime } from "@halaalvest/db"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { ReportsView } from "@/components/reports/reports-view"
import { loadReportsFilterParams } from "@/hooks/use-reports-filter-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const filters = loadReportsFilterParams(await searchParams)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        description="Operational reporting and audit visibility for cooperative admins."
        eyebrow="Reports"
        title="Audit and reporting"
      >
        <WorkspaceEmptyState
          body="Once the database-backed environment is active, this route will surface audit activity, notification delivery stats, and finance snapshots."
          title="Reporting needs the database runtime."
        />
      </WorkspacePageShell>
    )
  }

  if (!hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)) {
    return (
      <WorkspacePageShell
        description="Operational reporting and audit visibility for cooperative admins."
        eyebrow="Reports"
        title="Audit and reporting"
      >
        <WorkspaceEmptyState
          body="Cooperative admins and super admins can access audit and reporting surfaces."
          title="Report access is limited."
        />
      </WorkspacePageShell>
    )
  }

  await Promise.all([
    prefetch(
      trpc.reports.summary.queryOptions({
        from: filters.from ?? undefined,
        to: filters.to ?? undefined,
      }),
    ),
    prefetch(trpc.filters.reports.queryOptions()),
  ])

  return (
    <HydrateClient>
      <ReportsView filters={filters} />
    </HydrateClient>
  )
}
