"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import { formatCurrency, formatPercent } from "@halaalvest/utils"
import { ReportsHeader } from "@/components/reports-header"
import { WorkspacePageShell } from "@/components/dashboard"
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
      className="group flex h-full min-h-[112px] flex-col items-start justify-between rounded-none border border-border bg-background p-4 text-left hover:border-foreground/20 hover:bg-muted"
      href={href}
      variant="ghost"
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="mt-4 text-2xl font-medium text-foreground">
        {value}
      </span>
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

function FinanceSnapshot({ data }: { data: ReportsSummary["financeSnapshot"] }) {
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
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

function ExportCatalog({ filters }: { filters: ReportsFilterParams }) {
  return (
    <OverviewSection
      actions={
        <OverviewActionLink href={withReportFilters("/reports/audit", filters)}>
          Open audit viewer
        </OverviewActionLink>
      }
      eyebrow="Exports"
      title="Report exports"
    >
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reportExports.map((item) => (
          <a
            className="border border-border bg-background p-4 text-sm transition hover:border-foreground/30 hover:bg-muted"
            href={withReportFilters(item.href, filters)}
            key={item.href}
          >
            <p className="text-xs text-muted-foreground">{item.category}</p>
            <p className="mt-2 font-medium text-foreground">{item.title}</p>
            <p className="mt-2 leading-6 text-muted-foreground">{item.body}</p>
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
      actions={<OverviewPill>{items.length} events</OverviewPill>}
      eyebrow="Audit"
      title="Recent audit trail"
    >
      <div className="mt-4 divide-y divide-border border border-border">
        {items.length ? (
          items.map((item) => (
            <OverviewActionLink
              className="block h-auto rounded-none border-0 px-4 py-3 text-left hover:bg-muted"
              href={item.href}
              key={item.id}
              variant="ghost"
            >
              <span className="block text-sm font-medium text-foreground">
                {item.action}
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
      actions={<OverviewPill>{items.length} follow-ups</OverviewPill>}
      eyebrow="Collections"
      title="Collections evidence"
    >
      <div className="mt-4 divide-y divide-border border border-border">
        {items.length ? (
          items.map((item) => (
            <OverviewActionLink
              className="block h-auto rounded-none border-0 px-4 py-3 text-left hover:bg-muted"
              href={item.href}
              key={item.id}
              variant="ghost"
            >
              <span className="block text-sm font-medium text-foreground">
                {item.memberName}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
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
    trpc.reports.summary.queryOptions(queryInput),
  )
  const { data: filterList } = useSuspenseQuery(
    trpc.filters.reports.queryOptions(),
  )

  return (
    <WorkspacePageShell
      description="Audit evidence, reconciliation exports, collections follow-up, and compliance-sensitive reporting for tenant admins."
      eyebrow="Reports"
      title="Audit and reporting"
    >
      <ReportsHeader filterList={filterList} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricLink
          detail="Recent tenant audit volume."
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
          detail="Notification outbox entries delivered in this range."
          href="/notifications"
          label="Emails sent"
          tone="positive"
          value={data.notificationDelivery.sent.toString()}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <FinanceSnapshot data={data.financeSnapshot} />
        <ExportCatalog filters={filters} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ComplianceWatch items={data.complianceWatch} />
        <OverviewSection eyebrow="Delivery" title="Notification delivery">
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <SmallStat label="Total" value={data.notificationDelivery.total} />
            <SmallStat label="Sent" value={data.notificationDelivery.sent} />
            <SmallStat label="Queued" value={data.notificationDelivery.queued} />
            <SmallStat label="Failed" value={data.notificationDelivery.failed} />
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

      <section className="grid gap-4 xl:grid-cols-2">
        <AuditTrail items={data.auditPreview} />
        <CollectionsEvidence items={data.collectionsPreview} />
      </section>
    </WorkspacePageShell>
  )
}
