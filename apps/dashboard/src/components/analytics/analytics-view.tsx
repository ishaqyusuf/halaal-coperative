"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { formatCurrency } from "@halaalvest/utils"
import { useSuspenseQuery } from "@tanstack/react-query"
import { ChevronRight } from "lucide-react"
import { Suspense, useDeferredValue } from "react"
import { PeriodButtons } from "@/components/period-buttons"
import { SummaryCard, SummaryCardSkeleton } from "@/components/summary-card"
import { useAnalyticsParams } from "@/hooks/use-analytics-params"
import { overdueRepaymentScheduleHref } from "@/lib/repayments/repayments-drilldown"
import { useTRPC } from "@/trpc/client"
import {
  analyticsPeriodOptions,
  getPaidShare,
  sumMonths,
  type AnalyticsPeriod,
  type AnalyticsSummary,
} from "./analytics-utils"
import { MonthColumnsChart } from "./month-columns-chart"

// Validated with the dataviz palette checker (light on #ffffff, dark on #0e1c2a).
const receivedBar = "bg-[#1f7a3d] dark:bg-[#34a85c]"
const expectedBar = "bg-[#7b8590] dark:bg-[#6b7887]"
const paidOutBar = "bg-[#1c46c2] dark:bg-[#4a86e8]"

function Section({
  children,
  id,
  line,
  title,
}: {
  children: React.ReactNode
  id: string
  line?: string
  title: string
}) {
  return (
    <section aria-labelledby={id} className="grid min-w-0 content-start gap-4">
      <div className="grid gap-1">
        <h2 className="text-xl font-semibold text-foreground" id={id}>
          {title}
        </h2>
        {line ? (
          <p className="text-base text-muted-foreground">{line}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function CountRows({
  rows,
}: {
  rows: Array<{ href: string; label: string; value: string }>
}) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {rows.map((row) => (
        <li key={row.label}>
          <Link
            className="flex min-h-14 items-center gap-3 px-1 py-3 text-base hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
            href={row.href}
          >
            <span className="min-w-0 flex-1 text-foreground">{row.label}</span>
            <span className="text-lg font-semibold tabular-nums">
              {row.value}
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground"
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function LateBreakdown({ late }: { late: AnalyticsSummary["late"] }) {
  const rows = [
    { label: "Under 30 days late", value: late.under30Days },
    { label: "30 to 59 days late", value: late.from30To59Days },
    { label: "60 to 89 days late", value: late.from60To89Days },
    { label: "90 days or more", value: late.over90Days },
  ]

  return (
    <ul className="divide-y divide-border border-y border-border">
      {rows.map((row) => (
        <li
          className="grid gap-2 px-1 py-3 sm:grid-cols-[12rem_1fr_9rem] sm:items-center sm:gap-4 sm:px-3"
          key={row.label}
        >
          <span className="flex items-baseline justify-between gap-3 text-base sm:contents">
            <span className="text-foreground">{row.label}</span>
            <span className="text-lg font-semibold tabular-nums sm:order-last sm:text-right">
              {formatCurrency(row.value)}
            </span>
          </span>
          <span aria-hidden="true" className="block h-2 rounded-full bg-muted">
            <span
              className="block h-2 rounded-full bg-amber-600 dark:bg-amber-400"
              style={{
                width: `${late.amount > 0 ? Math.round((row.value / late.amount) * 100) : 0}%`,
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  )
}

function AnalyticsContent({ period }: { period: AnalyticsPeriod }) {
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(
    trpc.analytics.summary.queryOptions({ period })
  )
  const { keyNumbers, late, members, months, shares } = data
  const paidShare = getPaidShare(
    keyNumbers.receivedThisMonth,
    keyNumbers.expectedThisMonth
  )
  const received = sumMonths(months, "received")
  const paidOut = sumMonths(months, "loansPaidOut")
  const repaid = sumMonths(months, "loanRepayments")

  return (
    <>
      <section aria-labelledby="analytics-key-numbers" className="grid gap-3">
        <h2 className="sr-only" id="analytics-key-numbers">
          Key numbers today
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            detail={
              keyNumbers.approvedNotPaidOut > 0
                ? `${formatCurrency(keyNumbers.approvedNotPaidOut)} approved, not yet paid out`
                : "Free for new loans"
            }
            href="/loans"
            label="Money ready to lend"
            tone={keyNumbers.moneyToLend > 0 ? "good" : "attention"}
            value={formatCurrency(keyNumbers.moneyToLend)}
          />
          <SummaryCard
            detail={
              paidShare === null
                ? "Nothing expected yet"
                : `${paidShare}% of ${formatCurrency(keyNumbers.expectedThisMonth)}`
            }
            href="/monthly-records"
            label="Paid this month"
            tone={
              paidShare === null || paidShare >= 90 ? "default" : "attention"
            }
            value={formatCurrency(keyNumbers.receivedThisMonth)}
          />
          <SummaryCard
            detail="Still to be repaid"
            href="/loans?view=portfolio"
            label="Owed on loans"
            value={formatCurrency(keyNumbers.owedOnLoans)}
          />
          <SummaryCard
            detail={
              keyNumbers.lateLoanCount
                ? `On ${keyNumbers.lateLoanCount} ${keyNumbers.lateLoanCount === 1 ? "loan" : "loans"}`
                : "Nothing late"
            }
            href={overdueRepaymentScheduleHref}
            label="Late loan payments"
            tone={keyNumbers.latePayments > 0 ? "attention" : "good"}
            value={formatCurrency(keyNumbers.latePayments)}
          />
        </div>
      </section>

      <div className="grid gap-10 xl:grid-cols-2 xl:gap-12">
        <Section
          id="analytics-savings"
          line={`${formatCurrency(received)} paid, ${data.periodLabel}.`}
          title="Monthly savings"
        >
          <MonthColumnsChart
            months={months}
            series={[
              { barClassName: receivedBar, key: "received", label: "Paid" },
              {
                barClassName: expectedBar,
                key: "expected",
                label: "Expected",
              },
            ]}
            title="Monthly savings: paid and expected"
          />
        </Section>

        <Section
          id="analytics-loans"
          line={`${formatCurrency(paidOut)} paid out and ${formatCurrency(repaid)} repaid, ${data.periodLabel}.`}
          title="Loans"
        >
          <MonthColumnsChart
            months={months}
            series={[
              {
                barClassName: paidOutBar,
                key: "loansPaidOut",
                label: "Paid out",
              },
              {
                barClassName: receivedBar,
                key: "loanRepayments",
                label: "Repaid",
              },
            ]}
            title="Loans: paid out and repaid each month"
          />
        </Section>
      </div>

      {late.amount > 0 ? (
        <Section
          id="analytics-late"
          line={`${formatCurrency(late.amount)} late today, on ${late.loanCount} ${late.loanCount === 1 ? "loan" : "loans"}.`}
          title="Late loan payments"
        >
          <LateBreakdown late={late} />
        </Section>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <Section id="analytics-members" title="Members">
          <CountRows
            rows={[
              {
                href: "/members",
                label: "Active members",
                value: members.active.toLocaleString("en-NG"),
              },
              {
                href: "/membership-approvals",
                label: "Waiting to join",
                value: members.waitingToJoin.toLocaleString("en-NG"),
              },
              {
                href: "/members?kycStatus=pending",
                label: "ID checks to review",
                value: members.idChecksToReview.toLocaleString("en-NG"),
              },
              {
                href: "/members",
                label: "Documents to review",
                value: members.documentsToReview.toLocaleString("en-NG"),
              },
            ]}
          />
        </Section>
        <Section id="analytics-shares" title="Shares and profit">
          <CountRows
            rows={[
              {
                href: "/shares",
                label: "Share money paid in",
                value: formatCurrency(shares.shareCapital),
              },
              {
                href: "/business",
                label: "Profit not yet shared",
                value: formatCurrency(shares.profitNotShared),
              },
              {
                href: "/business",
                label: "Businesses running",
                value: shares.activeBusinesses.toLocaleString("en-NG"),
              },
            ]}
          />
        </Section>
      </div>
    </>
  )
}

function AnalyticsContentSkeleton() {
  return (
    <div aria-label="Loading analytics" className="grid gap-10" role="status">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SummaryCardSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-10 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="h-72 animate-pulse rounded bg-muted" key={index} />
        ))}
      </div>
    </div>
  )
}

export function AnalyticsView() {
  const { period, setParams } = useAnalyticsParams()
  // The figures render from the deferred period, so the current ones stay on
  // screen (dimmed) while the next period's summary loads.
  const shownPeriod = useDeferredValue(period)
  const isStale = shownPeriod !== period

  return (
    <div className="grid min-w-0 gap-8">
      <PeriodButtons
        label="Period"
        onChange={(value) => void setParams({ period: value })}
        options={analyticsPeriodOptions}
        value={period}
      />
      <div
        aria-busy={isStale}
        className={
          isStale
            ? "grid gap-10 opacity-60 transition-opacity"
            : "grid gap-10 transition-opacity"
        }
      >
        <Suspense fallback={<AnalyticsContentSkeleton />}>
          <AnalyticsContent period={shownPeriod} />
        </Suspense>
      </div>
    </div>
  )
}
