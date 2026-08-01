"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import { formatCurrency, formatPercent } from "@halaalvest/utils"
import { ReportsHeader } from "@/components/reports-header"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { useTRPC } from "@/trpc/client"
import type { ReportsFilterParams } from "@/hooks/use-reports-filter-params"
import {
  OverviewActionLink,
  OverviewPill,
  OverviewSection,
  OverviewTile,
} from "../widgets/overview-ui"
import {
  formatShortDate,
  getCountTone,
  reportExports,
  withReportFilters,
  type ReportsSummary,
} from "./reports-utils"

export function ReportsUnavailableView({
  body,
  title,
}: {
  body: string
  title: string
}) {
  return (
    <WorkspacePageShell
      description="Operational reporting and audit visibility for cooperative admins."
      eyebrow="Reports"
      title="Audit and reporting"
    >
      <WorkspaceEmptyState body={body} title={title} />
    </WorkspacePageShell>
  )
}

function MetricLink({
  detail,
  href,
  label,
  tone = "neutral",
  value,
}: {
  detail: string
  href: string
  label: string
  tone?: "neutral" | "positive" | "warning"
  value: string
}) {
  return (
    <OverviewActionLink
      className="group flex h-full min-h-[112px] min-w-0 flex-col items-start justify-between rounded-none border border-border bg-background p-4 text-left hover:border-foreground/20 hover:bg-muted"
      href={href}
      variant="ghost"
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="mt-4 text-2xl font-medium text-foreground">{value}</span>
      <span className="mt-2 text-xs leading-5 text-muted-foreground">
        {detail}
      </span>
      <span
        className={
          tone === "warning"
            ? "mt-3 block h-0.5 w-8 bg-amber-300"
            : tone === "positive"
              ? "mt-3 block h-0.5 w-8 bg-emerald-300"
              : "mt-3 block h-0.5 w-8 bg-border"
        }
      />
    </OverviewActionLink>
  )
}

function SmallStat({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <OverviewTile>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-medium text-foreground">{value}</dd>
    </OverviewTile>
  )
}

function FinanceSnapshot({
  data,
}: {
  data: ReportsSummary["financeSnapshot"]
}) {
  return (
    <OverviewSection
      actions={
        <OverviewPill tone={getCountTone(data.portfolioAtRiskAmount)}>
          {formatPercent(data.portfolioAtRiskRate)} PAR
        </OverviewPill>
      }
      eyebrow="Finance"
      title="Reportable finance snapshot"
    >
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SmallStat
          label="Deployable funds"
          value={formatCurrency(data.deployableFunds)}
        />
        <SmallStat
          label="Collection coverage"
          value={formatPercent(data.collectionCoverage)}
        />
        <SmallStat
          label="Outstanding principal"
          value={formatCurrency(data.outstandingPrincipal)}
        />
        <SmallStat
          label="Overdue amount"
          value={formatCurrency(data.overdueAmount)}
        />
        <SmallStat
          label="Pending disbursements"
          value={data.pendingDisbursementCount}
        />
      </dl>
    </OverviewSection>
  )
}

function ExportCatalog({
  exportVisibility,
  filters,
}: {
  exportVisibility: ReportsSummary["exportVisibility"]
  filters: ReportsFilterParams
}) {
  const visibleExports = reportExports.filter(
    (item) => exportVisibility[item.href] !== false
  )

  return (
    <OverviewSection
      actions={
        <OverviewActionLink href={withReportFilters("/reports/audit", filters)}>
          Open activity report
        </OverviewActionLink>
      }
      eyebrow="Exports"
      title="Report exports"
    >
      <div className="mt-4 min-w-0 divide-y divide-border border border-border md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:border-0 xl:grid-cols-3">
        {visibleExports.map((item) => (
          <a
            className="flex min-h-14 min-w-0 items-center justify-between gap-3 px-3 py-3 text-sm transition hover:bg-muted md:block md:min-h-0 md:border md:border-border md:bg-background md:p-4 md:hover:border-foreground/30"
            href={withReportFilters(item.href, filters)}
            key={item.href}
          >
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">
                {item.category}
              </span>
              <span className="mt-1 block font-medium text-foreground md:mt-2">
                {item.title}
              </span>
              <span className="mt-2 hidden leading-6 text-muted-foreground md:block">
                {item.body}
              </span>
            </span>
            <span className="shrink-0 text-xs font-medium text-muted-foreground md:hidden">
              CSV
            </span>
          </a>
        ))}
      </div>
    </OverviewSection>
  )
}

function ComplianceWatch({
  items,
}: {
  items: ReportsSummary["complianceWatch"]
}) {
  return (
    <OverviewSection eyebrow="Compliance" title="Review watch">
      <div className="mt-4 divide-y divide-border border border-border">
        {items.map((item) => (
          <OverviewActionLink
            className="flex h-auto w-full items-center justify-between rounded-none border-0 px-4 py-3 text-left hover:bg-muted"
            href={item.href}
            key={item.key}
            variant="ghost"
          >
            <span className="text-sm text-foreground">{item.label}</span>
            <OverviewPill tone={item.tone}>{item.count}</OverviewPill>
          </OverviewActionLink>
        ))}
      </div>
    </OverviewSection>
  )
}

function AuditTrail({ items }: { items: ReportsSummary["auditPreview"] }) {
  return (
    <OverviewSection
      actions={
        <>
          <OverviewPill>{items.length} events</OverviewPill>
          <OverviewActionLink href="/reports/audit">
            Open report
          </OverviewActionLink>
        </>
      }
      className="!h-auto"
      eyebrow="Audit"
      title="Recent activity trail"
    >
      <div className="mt-4 divide-y divide-border border border-border">
        {items.length ? (
          items.map((item) => (
            <OverviewActionLink
              className="!block !h-auto min-h-11 w-full rounded-none border-0 px-4 py-3 text-left hover:bg-muted md:min-h-0"
              href={item.href}
              key={item.id}
              variant="ghost"
            >
              <span className="block text-sm font-medium break-words text-foreground">
                {item.actionLabel}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {item.actorLabel} · {item.entityType} ·{" "}
                {formatShortDate(item.occurredAt)}
              </span>
            </OverviewActionLink>
          ))
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            No audit events in the selected range.
          </p>
        )}
      </div>
    </OverviewSection>
  )
}

function CollectionsEvidence({
  items,
}: {
  items: ReportsSummary["collectionsPreview"]
}) {
  return (
    <OverviewSection
      actions={
        <>
          <OverviewPill>{items.length} follow-ups</OverviewPill>
          <OverviewActionLink href="/repayments">Open cases</OverviewActionLink>
        </>
      }
      className="!h-auto"
      eyebrow="Collections"
      title="Collections evidence"
    >
      <div className="mt-4 divide-y divide-border border border-border">
        {items.length ? (
          items.map((item) => (
            <OverviewActionLink
              className="!block !h-auto min-h-11 w-full rounded-none border-0 px-4 py-3 text-left hover:bg-muted md:min-h-0"
              href={item.href}
              key={item.id}
              variant="ghost"
            >
              <span className="block text-sm font-medium text-foreground">
                {item.memberName}
              </span>
              <span className="mt-1 block text-xs break-words text-muted-foreground">
                {item.loanProductName} · {item.status.replace(/_/g, " ")} ·{" "}
                {item.resolutionStatus}
              </span>
              <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                {item.note}
              </span>
            </OverviewActionLink>
          ))
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            No collections follow-up activity in the selected range.
          </p>
        )}
      </div>
    </OverviewSection>
  )
}

export function ReportsView({ filters }: { filters: ReportsFilterParams }) {
  const trpc = useTRPC()
  const queryInput = {
    from: filters.from ?? undefined,
    to: filters.to ?? undefined,
  }
  const { data } = useSuspenseQuery(
    trpc.reports.summary.queryOptions(queryInput)
  )
  const { data: filterList } = useSuspenseQuery(
    trpc.filters.reports.queryOptions()
  )

  return (
    <WorkspacePageShell
      description="Audit evidence, reconciliation exports, collections follow-up, and compliance-sensitive reporting for cooperative admins."
      eyebrow="Reports"
      title="Activity and reporting"
    >
      <div className="min-w-0 max-md:[&_a]:min-h-11 max-md:[&_button]:min-h-11 max-md:[&_input]:min-h-11 max-md:[&_select]:min-h-11">
        <ReportsHeader filterList={filterList} />

        <div className="mt-6 space-y-6">
          <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricLink
              detail="Recent cooperative audit volume."
              href="/reports/audit"
              label="Audit events"
              tone={getCountTone(data.governanceMetrics.auditEventsInRange)}
              value={data.governanceMetrics.auditEventsInRange.toString()}
            />
            <MetricLink
              detail="Open collections cases that still need evidence or action."
              href="/repayments"
              label="Open collections"
              tone={getCountTone(data.governanceMetrics.openCollectionCases)}
              value={data.governanceMetrics.openCollectionCases.toString()}
            />
            <MetricLink
              detail="KYC records currently pending staff review."
              href="/members?kycStatus=pending"
              label="KYC pending"
              tone={getCountTone(data.governanceMetrics.kycPending)}
              value={data.governanceMetrics.kycPending.toString()}
            />
            <MetricLink
              detail="Direct notification emails sent in this range."
              href="/notifications"
              label="Emails sent"
              tone="positive"
              value={data.notificationDelivery.sent.toString()}
            />
          </section>

          <section className="min-w-0">
            <FinanceSnapshot data={data.financeSnapshot} />
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-3">
            <ComplianceWatch items={data.complianceWatch} />
            <OverviewSection eyebrow="Delivery" title="Notification delivery">
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <SmallStat
                  label="Total"
                  value={data.notificationDelivery.total}
                />
                <SmallStat
                  label="Sent"
                  value={data.notificationDelivery.sent}
                />
                <SmallStat
                  label="Queued"
                  value={data.notificationDelivery.queued}
                />
                <SmallStat
                  label="Failed"
                  value={data.notificationDelivery.failed}
                />
              </dl>
            </OverviewSection>
            <OverviewSection eyebrow="Governance" title="30-day audit split">
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <SmallStat
                  label="User events"
                  value={data.governanceMetrics.userEvents30d}
                />
                <SmallStat
                  label="System events"
                  value={data.governanceMetrics.systemEvents30d}
                />
                <SmallStat
                  label="High-priority cases"
                  value={data.governanceMetrics.highPriorityCollectionCases}
                />
                <SmallStat
                  label="Failed imports"
                  value={data.governanceMetrics.failedImports}
                />
              </dl>
            </OverviewSection>
          </section>

          <section className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
            <AuditTrail items={data.auditPreview} />
            <CollectionsEvidence items={data.collectionsPreview} />
          </section>

          <section className="min-w-0">
            <ExportCatalog
              exportVisibility={data.exportVisibility}
              filters={filters}
            />
          </section>
        </div>
      </div>
    </WorkspacePageShell>
  )
}
