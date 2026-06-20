import { createDbRuntime, getAuditSummary, getCollectionFollowUpSummary, getMemberKycSummary, getReportsFilterMetadata, listAuditLogs, listCollectionFollowUps, listNotificationOutboxEntries } from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { ReportsHeader } from "@/components/reports-header"
import { DashboardActionLink, DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, DashboardSurfaceCard, TrendPill, WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { loadReportsFilterParams } from "@/hooks/use-reports-filter-params"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"
import { getReportsDateFilters, withReportFilters } from "./export-utils"

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = loadReportsFilterParams(await searchParams)
  const { dashboard } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const filters = getReportsDateFilters({
    from: params.from ?? undefined,
    to: params.to ?? undefined,
  })
  const canViewReports = hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return <WorkspacePageShell eyebrow="Reports" title="Audit and reporting" description="Operational reporting and audit visibility for cooperative admins."><WorkspaceEmptyState title="Reporting needs the database runtime." body="Once the database-backed environment is active, this route will surface audit activity, notification delivery stats, and finance snapshots." /></WorkspacePageShell>
  }
  if (!canViewReports) {
    return <WorkspacePageShell eyebrow="Reports" title="Audit and reporting" description="Operational reporting and audit visibility for cooperative admins."><WorkspaceEmptyState title="Report access is limited." body="Tenant admins and super admins can access audit and reporting surfaces." /></WorkspacePageShell>
  }

  const [auditSummary, auditLogs, collectionSummary, collectionFollowUps, filterList, kycSummary, notificationEntries] = await Promise.all([
    getAuditSummary(context.tenant.id),
    listAuditLogs(context.tenant.id, { fromDate: filters.fromDate, limit: 20, toDate: filters.toDate }),
    getCollectionFollowUpSummary(context.tenant.id),
    listCollectionFollowUps(context.tenant.id, { fromDate: filters.fromDate, limit: 12, toDate: filters.toDate }),
    getReportsFilterMetadata(),
    getMemberKycSummary(context.tenant.id),
    listNotificationOutboxEntries(context.tenant.id, { fromDate: filters.fromDate, limit: 50, toDate: filters.toDate }),
  ])

  const exports = [
    ["Audit CSV", "/reports/audit-export", "Download recent audit activity for external review."],
    ["Collections CSV", "/reports/collections-export", "Download installment status, overdue exposure, and outstanding balances."],
    ["Notifications CSV", "/reports/notifications-export", "Download notification delivery outcomes for support and compliance follow-up."],
    ["Contributions CSV", "/reports/contributions-export", "Download savings, commitment, and extra-savings records for finance review."],
    ["Loans CSV", "/reports/loans-export", "Download loan requests and active-loan servicing details in one finance extract."],
    ["Member statements CSV", "/reports/member-statements-export", "Download one row per member with commitments, savings, loan exposure, and repayment totals."],
    ["Member ledgers CSV", "/reports/member-ledgers-export", "Download chronological ledger transactions across member money movements."],
    ["Charges CSV", "/reports/charges-export", "Download assessed charges, levy activity, and member-level charge records."],
    ["Repayments CSV", "/reports/repayments-export", "Download repayment postings for reconciliation and member servicing review."],
  ] as const

  return (
    <WorkspacePageShell eyebrow="Reports" title="Audit and reporting" description="Review operational activity, finance snapshots, exports, and recent audit events from one admin route.">
      <ReportsHeader filterList={filterList} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label="Available pool" value={formatCurrency(dashboard.availablePool)} detail="Liquidity snapshot from the current dashboard summary." />
        <DashboardStatCard label="Active loans" value={dashboard.activeLoans.toString()} detail="Currently active credit exposure." />
        <DashboardStatCard label="Audit events (30d)" value={auditSummary.recentActionsCount.toString()} detail="Recent audit volume across the tenant workspace." />
        <DashboardStatCard label="Emails sent" value={notificationEntries.filter((entry) => entry.status === "sent").length.toString()} detail="Notification outbox entries delivered in the selected window." tone="positive" />
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <DashboardStatCard label="User events" value={auditSummary.userEventsCount.toString()} detail="User-originated audit actions in the last 30 days." />
        <DashboardStatCard label="System events" value={auditSummary.systemEventsCount.toString()} detail="System-generated audit actions in the last 30 days." />
        <DashboardStatCard label="Collections follow-ups" value={collectionSummary.total.toString()} detail="Follow-up records captured in collections workflows." />
        <DashboardStatCard label="Open cases" value={collectionSummary.activeCases.toString()} detail="Collections cases still unresolved." tone={collectionSummary.activeCases ? "warning" : "default"} />
        <DashboardStatCard label="KYC pending" value={kycSummary.pending.toString()} detail={`${kycSummary.withDocuments} document records · ${kycSummary.approvedDocuments} approved`} tone={kycSummary.pending ? "warning" : "positive"} />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader eyebrow="Exports" title="Report exports" description="One-click downloads for audit, collections, notifications, contributions, loans, statements, ledgers, charges, and repayments." actions={<DashboardActionLink href={withReportFilters("/reports/audit", filters)}>Open full audit viewer</DashboardActionLink>} />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exports.map(([title, href, body]) => (
            <DashboardSurfaceCard as="article" key={href} className="p-5 text-sm transition hover:border-foreground/30">
              <a href={withReportFilters(href, filters)}>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Export</p>
              <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">{title}</p>
              <p className="mt-2 leading-6 text-muted-foreground">{body}</p>
              </a>
            </DashboardSurfaceCard>
          ))}
        </div>
      </DashboardSectionCard>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Audit" title="Recent audit activity" actions={<TrendPill>{auditLogs.length} events</TrendPill>} />
          <div className="mt-5 space-y-3">
            {auditLogs.map((log) => (
              <DashboardSurfaceCard key={log.id}>
                <p className="font-medium text-foreground">{log.action}</p>
                <p className="text-sm text-muted-foreground">{log.actorUser?.fullName ?? log.actorType} · {log.entityType}</p>
                <p className="mt-1 text-xs text-muted-foreground">{log.occurredAt.toISOString().slice(0, 10)}</p>
              </DashboardSurfaceCard>
            ))}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Collections" title="Collections follow-up activity" actions={<TrendPill>{collectionFollowUps.length} follow-ups</TrendPill>} />
          <div className="mt-5 space-y-3">
            {collectionFollowUps.length ? collectionFollowUps.map((followUp) => (
              <DashboardSurfaceCard key={followUp.id}>
                <p className="font-medium text-foreground">{followUp.member.fullName}</p>
                <p className="text-sm text-muted-foreground">{followUp.loan.loanProduct.name} · {followUp.status.replace(/_/g, " ")}</p>
                <p className="mt-2 text-sm text-muted-foreground">{followUp.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {followUp.caseStage.replace(/_/g, " ")} · {followUp.resolutionStatus}
                  {followUp.assignedToUser ? ` · assigned ${followUp.assignedToUser.fullName}` : ""}
                </p>
              </DashboardSurfaceCard>
            )) : <p className="text-sm text-muted-foreground">No collections follow-up activity in the selected window.</p>}
          </div>
        </DashboardSectionCard>
      </section>
    </WorkspacePageShell>
  )
}
