"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { formatCurrency, resolveDateFilter } from "@halaalvest/utils"
import { useSuspenseQuery } from "@tanstack/react-query"
import { ChevronRight, Download } from "lucide-react"
import { WorkspaceEmptyState } from "@/components/dashboard"
import { PeriodButtons } from "@/components/period-buttons"
import { ReportExportDialog } from "@/components/sheets/report-export-dialog"
import { SummaryCard } from "@/components/summary-card"
import { useReportExportParams } from "@/hooks/use-report-export-params"
import {
  type ReportsFilterParams,
  useReportsFilterParams,
} from "@/hooks/use-reports-filter-params"
import {
  getPeriodChoiceForRange,
  getVisibleReportExports,
  reportGroups,
  reportPeriodChoices,
} from "@/lib/reports/report-catalog"
import { useTRPC } from "@/trpc/client"
import { formatDateAndTime, formatDayMonthYear } from "@/utils/format"

export function ReportsUnavailableView({
  body,
  title,
}: {
  body: string
  title: string
}) {
  return <WorkspaceEmptyState body={body} title={title} />
}

/** "All time", "This month" or "1 Nov 2026 to 30 Nov 2026". */
export function getReportPeriodLabel(dateRange: string[] | null | undefined) {
  const choice = getPeriodChoiceForRange(dateRange)
  if (choice === "all") return "All time"

  const preset = reportPeriodChoices.find((option) => option.value === choice)
  if (preset) return preset.label

  const resolved = resolveDateFilter(dateRange)
  const from = formatDayMonthYear(resolved?.from)
  const to = formatDayMonthYear(resolved?.to)
  if (from && to) return `${from} to ${to}`
  if (from) return `From ${from}`
  if (to) return `Up to ${to}`
  return "All time"
}

function SectionHeading({ id, children }: { children: string; id: string }) {
  return (
    <h2 className="text-xl font-semibold text-foreground" id={id}>
      {children}
    </h2>
  )
}

export function ReportsView({ filters }: { filters: ReportsFilterParams }) {
  const trpc = useTRPC()
  const { setFilters } = useReportsFilterParams()
  const { setParams: setExportParams } = useReportExportParams()
  const resolvedDateRange = resolveDateFilter(filters.dateRange)
  const { data } = useSuspenseQuery(
    trpc.reports.summary.queryOptions({
      from: resolvedDateRange?.from,
      to: resolvedDateRange?.to,
    })
  )
  const choice = getPeriodChoiceForRange(filters.dateRange)
  const periodLabel = getReportPeriodLabel(filters.dateRange)
  const reports = getVisibleReportExports(data.exportVisibility)
  const { figures } = data

  return (
    <div className="grid min-w-0 gap-10">
      <section aria-labelledby="reports-period" className="grid gap-4">
        <h2 className="sr-only" id="reports-period">
          Period
        </h2>
        <PeriodButtons
          label="Period"
          onChange={(value) =>
            void setFilters({ dateRange: value === "all" ? null : [value] })
          }
          options={reportPeriodChoices}
          value={choice === "page" ? null : choice}
        />
        {choice === "page" ? (
          <p className="text-base text-muted-foreground">
            Showing {periodLabel}.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            detail={periodLabel}
            href="/contributions"
            label="Savings paid in"
            value={formatCurrency(figures.savingsPaidIn)}
          />
          <SummaryCard
            detail={periodLabel}
            href="/loans?view=portfolio"
            label="Loans paid out"
            value={formatCurrency(figures.loansPaidOut)}
          />
          <SummaryCard
            detail={periodLabel}
            href="/repayments?view=history"
            label="Loan repayments"
            value={formatCurrency(figures.loanRepayments)}
          />
          <SummaryCard
            detail={
              figures.lateLoanCount
                ? `Today, on ${figures.lateLoanCount} ${figures.lateLoanCount === 1 ? "loan" : "loans"}`
                : "Nothing late today"
            }
            href="/repayments"
            label="Late loan payments"
            tone={figures.latePayments > 0 ? "attention" : "good"}
            value={formatCurrency(figures.latePayments)}
          />
        </div>
      </section>

      {data.needsALook.length ? (
        <section aria-labelledby="reports-needs-a-look" className="grid gap-3">
          <SectionHeading id="reports-needs-a-look">
            Needs a look
          </SectionHeading>
          <ul className="divide-y divide-border border-y border-border">
            {data.needsALook.map((item) => (
              <li key={item.key}>
                <Link
                  className="flex min-h-14 items-center gap-3 px-1 py-3 text-base hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
                  href={item.href}
                >
                  <span className="min-w-0 flex-1 text-foreground">
                    {item.label}
                  </span>
                  <span className="text-lg font-semibold tabular-nums">
                    {item.count.toLocaleString("en-NG")}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="reports-download" className="grid gap-5">
        <div className="grid gap-1">
          <SectionHeading id="reports-download">
            Download a report
          </SectionHeading>
          <p className="text-base text-muted-foreground">
            Pick a report, then choose the dates.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-x-10">
          {reportGroups.map((group) => {
            const items = reports.filter((report) => report.group === group.key)
            if (!items.length) return null

            return (
              <div className="grid content-start gap-2" key={group.key}>
                <h3 className="text-lg font-semibold text-foreground">
                  {group.title}
                </h3>
                <ul className="divide-y divide-border border-y border-border">
                  {items.map((report) => (
                    <li key={report.key}>
                      <button
                        className="flex min-h-14 w-full items-center gap-3 px-1 py-3 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
                        data-report-export={report.key}
                        onClick={() =>
                          void setExportParams({ reportExport: report.key })
                        }
                        type="button"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold text-foreground">
                            {report.title}
                          </span>
                          <span className="block text-base text-muted-foreground">
                            {report.line}
                          </span>
                        </span>
                        <Download
                          aria-hidden="true"
                          className="size-5 shrink-0 text-muted-foreground"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="reports-activity" className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <SectionHeading id="reports-activity">Recent activity</SectionHeading>
          <Link
            className="inline-flex min-h-11 items-center gap-1 text-base font-medium text-primary underline-offset-4 hover:underline"
            href="/reports/audit"
          >
            See all activity
            <ChevronRight aria-hidden="true" className="size-5" />
          </Link>
        </div>
        {data.recentActivity.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {data.recentActivity.map((item) => (
              <li key={item.id}>
                <Link
                  className="flex min-h-14 items-center gap-3 px-1 py-3 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
                  href={`/reports/audit?activityId=${item.id}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold break-words text-foreground">
                      {item.actionLabel}
                    </span>
                    <span className="block text-base break-words text-muted-foreground">
                      {item.actorLabel} · {formatDateAndTime(item.occurredAt)}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-y border-border py-6 text-base text-muted-foreground">
            Nothing happened in this period.
          </p>
        )}
      </section>

      <ReportExportDialog
        pageDateRange={filters.dateRange}
        pagePeriodLabel={periodLabel}
      />
    </div>
  )
}
