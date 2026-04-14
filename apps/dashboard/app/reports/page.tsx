import {
  createDbRuntime,
  getAuditSummary,
  getCollectionFollowUpSummary,
  getMemberKycSummary,
  listAuditLogs,
  listCollectionFollowUps,
  listNotificationOutboxEntries,
} from "@halaal-vest/db"
import { formatCurrency } from "@halaal-vest/utils"
import { ReportsFilterForm } from "@/features/forms/misc-forms"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"
import { getReportsDateFilters, withReportFilters } from "./export-utils"

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { dashboard } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const filters = getReportsDateFilters(params)
  const canViewReports = hasAnyRole(context.auth.membership?.role, workspaceAdminRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Reports"
        title="Audit and reporting"
        description="Operational reporting and audit visibility for cooperative admins."
      >
        <WorkspaceEmptyState
          title="Reporting needs the database runtime."
          body="Once the database-backed environment is active, this route will surface audit activity, notification delivery stats, and finance snapshots."
        />
      </WorkspacePageShell>
    )
  }

  if (!canViewReports) {
    return (
      <WorkspacePageShell
        eyebrow="Reports"
        title="Audit and reporting"
        description="Operational reporting and audit visibility for cooperative admins."
      >
        <WorkspaceEmptyState
          title="Report access is limited."
          body="Tenant admins and super admins can access audit and reporting surfaces."
        />
      </WorkspacePageShell>
    )
  }

  const [auditSummary, auditLogs, collectionSummary, collectionFollowUps, kycSummary, notificationEntries] = await Promise.all([
    getAuditSummary(context.tenant.id),
    listAuditLogs(context.tenant.id, {
      fromDate: filters.fromDate,
      limit: 20,
      toDate: filters.toDate,
    }),
    getCollectionFollowUpSummary(context.tenant.id),
    listCollectionFollowUps(context.tenant.id, {
      fromDate: filters.fromDate,
      limit: 12,
      toDate: filters.toDate,
    }),
    getMemberKycSummary(context.tenant.id),
    listNotificationOutboxEntries(context.tenant.id, {
      fromDate: filters.fromDate,
      limit: 50,
      toDate: filters.toDate,
    }),
  ])

  return (
    <WorkspacePageShell
      eyebrow="Reports"
      title="Audit and reporting"
      description="Review operational activity, finance snapshots, and recent audit events from one admin route."
    >
      <ReportsFilterForm
        defaultValues={{ from: filters.from, to: filters.to }}
        devMode={process.env.NODE_ENV !== "production"}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Available pool</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {formatCurrency(dashboard.availablePool)}
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active loans</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{dashboard.activeLoans}</p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Audit events (30d)</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{auditSummary.recentActionsCount}</p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Emails sent</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {notificationEntries.filter((entry) => entry.status === "sent").length}
          </p>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">User events (30d)</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{auditSummary.userEventsCount}</p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">System events (30d)</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{auditSummary.systemEventsCount}</p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Delinquency</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            {Math.round(dashboard.delinquencyRate * 100)}%
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Collections follow-ups</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{collectionSummary.total}</p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Promise to pay</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{collectionSummary.promiseToPay}</p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">KYC pending</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{kycSummary.pending}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {kycSummary.withDocuments} document records · {kycSummary.approvedDocuments} approved
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Open collection cases</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{collectionSummary.activeCases}</p>
        </article>
        <article className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">High-priority cases</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{collectionSummary.highPriority}</p>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-8">
        <a
          className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 text-sm text-foreground shadow-sm transition hover:border-foreground/30"
          href={withReportFilters("/reports/audit-export", filters)}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Export</p>
          <p className="mt-3 text-lg font-semibold tracking-tight">Audit CSV</p>
          <p className="mt-2 leading-6 text-muted-foreground">Download recent audit activity for external review.</p>
        </a>
        <a
          className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 text-sm text-foreground shadow-sm transition hover:border-foreground/30"
          href={withReportFilters("/reports/collections-export", filters)}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Export</p>
          <p className="mt-3 text-lg font-semibold tracking-tight">Collections CSV</p>
          <p className="mt-2 leading-6 text-muted-foreground">Download installment status, overdue exposure, and outstanding balances.</p>
        </a>
        <a
          className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 text-sm text-foreground shadow-sm transition hover:border-foreground/30"
          href={withReportFilters("/reports/notifications-export", filters)}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Export</p>
          <p className="mt-3 text-lg font-semibold tracking-tight">Notifications CSV</p>
          <p className="mt-2 leading-6 text-muted-foreground">Download notification delivery outcomes for support and compliance follow-up.</p>
        </a>
        <a
          className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 text-sm text-foreground shadow-sm transition hover:border-foreground/30"
          href={withReportFilters("/reports/contributions-export", filters)}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Export</p>
          <p className="mt-3 text-lg font-semibold tracking-tight">Contributions CSV</p>
          <p className="mt-2 leading-6 text-muted-foreground">Download savings, commitment, and extra-savings records for finance review.</p>
        </a>
        <a
          className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 text-sm text-foreground shadow-sm transition hover:border-foreground/30"
          href={withReportFilters("/reports/loans-export", filters)}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Export</p>
          <p className="mt-3 text-lg font-semibold tracking-tight">Loans CSV</p>
          <p className="mt-2 leading-6 text-muted-foreground">Download loan requests and active-loan servicing details in one finance extract.</p>
        </a>
        <a
          className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 text-sm text-foreground shadow-sm transition hover:border-foreground/30"
          href={withReportFilters("/reports/member-statements-export", filters)}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Export</p>
          <p className="mt-3 text-lg font-semibold tracking-tight">Member statements CSV</p>
          <p className="mt-2 leading-6 text-muted-foreground">Download one row per member with commitments, savings, loan exposure, and repayment totals.</p>
        </a>
        <a
          className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 text-sm text-foreground shadow-sm transition hover:border-foreground/30"
          href={withReportFilters("/reports/member-ledgers-export", filters)}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Export</p>
          <p className="mt-3 text-lg font-semibold tracking-tight">Member ledgers CSV</p>
          <p className="mt-2 leading-6 text-muted-foreground">Download chronological ledger transactions across member money movements.</p>
        </a>
        <a
          className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 text-sm text-foreground shadow-sm transition hover:border-foreground/30"
          href={withReportFilters("/reports/charges-export", filters)}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Export</p>
          <p className="mt-3 text-lg font-semibold tracking-tight">Charges CSV</p>
          <p className="mt-2 leading-6 text-muted-foreground">Download assessed charges, levy activity, and member-level charge records.</p>
        </a>
        <a
          className="rounded-[1.5rem] border border-border/70 bg-background/92 p-5 text-sm text-foreground shadow-sm transition hover:border-foreground/30"
          href={withReportFilters("/reports/repayments-export", filters)}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Export</p>
          <p className="mt-3 text-lg font-semibold tracking-tight">Repayments CSV</p>
          <p className="mt-2 leading-6 text-muted-foreground">Download repayment postings for reconciliation and member servicing review.</p>
        </a>
      </div>

      <div className="flex justify-end">
        <a className="text-sm font-medium text-foreground underline-offset-4 hover:underline" href={withReportFilters("/reports/audit", filters)}>
          Open full audit viewer
        </a>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Recent audit activity</h3>
        </div>
        <div className="divide-y divide-border/60">
          {auditLogs.map((log) => (
            <article key={log.id} className="px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{log.action}</p>
                  <p className="text-sm text-muted-foreground">
                    {log.actorUser?.fullName ?? log.actorType} · {log.entityType}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">{log.occurredAt.toISOString().slice(0, 10)}</div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Collections follow-up activity</h3>
        </div>
        <div className="divide-y divide-border/60">
          {collectionFollowUps.length ? (
            collectionFollowUps.map((followUp) => (
              <article key={followUp.id} className="px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{followUp.member.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {followUp.loan.loanProduct.name} · {followUp.status.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{followUp.note}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {followUp.caseStage.replace(/_/g, " ")} · {followUp.resolutionStatus}
                      {followUp.assignedToUser ? ` · assigned ${followUp.assignedToUser.fullName}` : ""}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {followUp.createdAt.toISOString().slice(0, 10)}
                    {followUp.nextActionAt ? ` · next ${followUp.nextActionAt.toISOString().slice(0, 10)}` : ""}
                    {followUp.promiseToPayAt ? ` · promise ${followUp.promiseToPayAt.toISOString().slice(0, 10)}` : ""}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <article className="px-4 py-4 text-sm text-muted-foreground">
              No collections follow-up activity in the selected window.
            </article>
          )}
        </div>
      </div>
    </WorkspacePageShell>
  )
}
