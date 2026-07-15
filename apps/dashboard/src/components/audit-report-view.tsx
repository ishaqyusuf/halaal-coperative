import type { PageFilterData } from "@halaalvest/utils"
import { AuditColumnVisibility } from "@/components/audit-column-visibility"
import { AuditHeader } from "@/components/audit-header"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { AuditDataTable } from "@/components/tables/audit/data-table"
import type { TableSettings } from "@/utils/table-settings"

export function AuditReportUnavailableView() {
  return (
    <WorkspacePageShell
      description="Detailed activity evidence is available to workspace admin roles."
      eyebrow="Reports"
      title="Activity report"
    >
      <WorkspaceEmptyState
        body="This route is limited to admin roles in a configured cooperative workspace."
        title="Activity report unavailable."
      />
    </WorkspacePageShell>
  )
}

export function AuditReportView({
  filterList,
  initialTableSettings,
  systemCount,
  total,
  userCount,
}: {
  filterList: PageFilterData[]
  initialTableSettings: Partial<TableSettings>
  systemCount: number
  total: number
  userCount: number
}) {
  return (
    <WorkspacePageShell
      description="Search actor activity, authorizer evidence, entity changes, and operational events with a wider time window than the reports overview card."
      eyebrow="Reports"
      title="Activity report"
    >
      <AuditHeader filterList={filterList} />

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard
          detail="Audit events returned for the current filter set."
          label="Events loaded"
          value={total.toString()}
        />
        <DashboardStatCard
          detail="Actions performed by a user actor."
          label="User-originated"
          value={userCount.toString()}
        />
        <DashboardStatCard
          detail="Automated or system-generated events."
          label="System/integration"
          value={systemCount.toString()}
        />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <div className="flex items-center gap-2">
              <AuditColumnVisibility />
              <TrendPill>{total} events</TrendPill>
            </div>
          }
          eyebrow="Audit events"
          title="Detailed activity stream"
        />
        <div className="mt-5">
          <AuditDataTable initialSettings={initialTableSettings} />
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
