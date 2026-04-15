import { createDbRuntime, getAuditSummary, getCollectionFollowUpSummary, getMemberKycSummary, listAuditLogs, listCollectionFollowUps, listNotificationOutboxEntries } from "@halaal-vest/db"
import { formatCurrency } from "@halaal-vest/utils"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, TrendPill } from "@/components/dashboard/primitives"
import { ReportsFilterForm } from "@/features/forms/misc-forms"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"
import { getReportsDateFilters, withReportFilters } from "./export-utils"

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const { dashboard } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const filters = getReportsDateFilters(params)
  const canViewReports = hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return <WorkspacePageShell eyebrow="Reports" title="Audit and reporting" description="Operational reporting and audit visibility for cooperative admins."><WorkspaceEmptyState title="Reporting needs the database runtime." body="Once the database-backed environment is active, this route will surface audit activity, notification delivery stats, and finance snapshots." /></WorkspacePageShell>
  }
  if (!canViewReports) {
    return <WorkspacePageShell eyebrow="Reports" title="Audit and reporting" description="Operational reporting and audit visibility for cooperative admins."><WorkspaceEmptyState title="Report access is limited." body="Tenant admins and super admins can access audit and reporting surfaces." /></WorkspacePageShell>
  }

  const [auditSummary, auditLogs, collectionSummary, collectionFollowUps, kycSummary, notificationEntries] = await Promise.all([
    getAuditSummary(context.tenant.id),
    listAuditLogs(context.tenant.id, { fromDate: filters.fromDate, limit: 20, toDate: filters.toDate }),
    getCollectionFollowUpSummary(context.tenant.id),
    listCollectionFollowUps(context.tenant.id, { fromDate: filters.fromDate, limit: 12, toDate: filters.toDate }),
    getMemberKycSummary(context.tenant.id),
    listNotificationOutboxEntries(context.tenant.id, { fromDate: filters.fromDate, limit: 50, toDate: filters.toDate }),
  ])

  const exports = [
    ["Audit CSV", "/app/reports/audit-export", "Download recent audit activity for external review."],
    ["Collections CSV", "/app/reports/collections-export", "Download installment status, overdue exposure, and outstanding balances."],
    ["Notifications CSV", "/app/reports/notifications-export", "Download notification delivery outcomes for support and compliance follow-up."],
    ["Contributions CSV", "/app/reports/contributions-export", "Download savings, commitment, and extra-savings records for finance review."],
    ["Loans CSV", "/app/reports/loans-export", "Download loan requests and active-loan servicing details in one finance extract."],
    ["Member statements CSV", "/app/reports/member-statements-export", "Download one row per member with commitments, savings, loan exposure, and repayment totals."],
    ["Member ledgers CSV", "/app/reports/member-ledgers-export", "Download chronological ledger transactions across member money movements."],
    ["Charges CSV", "/app/reports/charges-export", "Download assessed charges, levy activity, and member-level charge records."],
    ["Repayments CSV", "/app/reports/repayments-export", "Download repayment postings for reconciliation and member servicing review."],
  ] as const

  return (
    <WorkspacePageShell eyebrow="Reports" title="Audit and reporting" description="Review operational activity, finance snapshots, exports, and recent audit events from one admin route.">
      <ReportsFilterForm defaultValues={{ from: filters.from, to: filters.to }} devMode={process.env.NODE_ENV !== "production"} />

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
        <DashboardSectionHeader eyebrow="Exports" title="Report exports" description="One-click downloads for audit, collections, notifications, contributions, loans, statements, ledgers, charges, and repayments." />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {exports.map(([title, href, body]) => (
            <a key={href} className="rounded-2xl border border-border/70 bg-muted/25 p-5 text-sm transition hover:border-foreground/30" href={withReportFilters(href, filters)}>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Export</p>
              <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">{title}</p>
              <p className="mt-2 leading-6 text-muted-foreground">{body}</p>
            </a>
          ))}
        </div>
      </DashboardSectionCard>

      <div className="flex justify-end">
        <a className="text-sm font-medium text-foreground underline-offset-4 hover:underline" href={withReportFilters("/app/reports/audit", filters)}>Open full audit viewer</a>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Audit" title="Recent audit activity" actions={<TrendPill>{auditLogs.length} events</TrendPill>} />
          <div className="mt-5 space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <p className="font-medium text-foreground">{log.action}</p>
                <p className="text-sm text-muted-foreground">{log.actorUser?.fullName ?? log.actorType} · {log.entityType}</p>
                <p className="mt-1 text-xs text-muted-foreground">{log.occurredAt.toISOString().slice(0, 10)}</p>
              </div>
            ))}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader eyebrow="Collections" title="Collections follow-up activity" actions={<TrendPill>{collectionFollowUps.length} follow-ups</TrendPill>} />
          <div className="mt-5 space-y-3">
            {collectionFollowUps.length ? collectionFollowUps.map((followUp) => (
              <div key={followUp.id} className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <p className="font-medium text-foreground">{followUp.member.fullName}</p>
                <p className="text-sm text-muted-foreground">{followUp.loan.loanProduct.name} · {followUp.status.replace(/_/g, " ")}</p>
                <p className="mt-2 text-sm text-muted-foreground">{followUp.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {followUp.caseStage.replace(/_/g, " ")} · {followUp.resolutionStatus}
                  {followUp.assignedToUser ? ` · assigned ${followUp.assignedToUser.fullName}` : ""}
                </p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No collections follow-up activity in the selected window.</p>}
          </div>
        </DashboardSectionCard>
      </section>
    </WorkspacePageShell>
  )
}
