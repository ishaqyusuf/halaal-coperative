"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import { formatCurrency, formatPercent } from "@halaalvest/utils"
import { useState } from "react"
import { useTRPC } from "@/trpc/client"
import {
  OverviewActionLink,
  OverviewPill,
  OverviewSection,
  OverviewTile,
} from "../widgets/overview-ui"
import {
  analyticsPeriodOptions,
  getBarWidth,
  getCoverageTone,
  getRiskTone,
  type AnalyticsPeriod,
  type AnalyticsSummary,
} from "./analytics-utils"

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
      href={href}
      variant="ghost"
      className="group flex !h-auto min-h-[160px] flex-col items-start rounded-none border border-border bg-background p-4 text-left hover:border-foreground/20 hover:bg-muted"
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="mt-4 text-2xl font-medium text-foreground">
        {value}
      </span>
      <span className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">
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

function MoneyRow({
  label,
  max,
  value,
}: {
  label: string
  max: number
  value: number
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[92px_1fr_132px] sm:items-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="h-2 bg-muted">
        <div
          className="h-2 bg-foreground"
          style={{ width: getBarWidth(value, max) }}
        />
      </div>
      <p className="text-sm font-medium text-foreground sm:text-right">
        {formatCurrency(value)}
      </p>
    </div>
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

function ContributionAnalytics({
  data,
}: {
  data: AnalyticsSummary["contributionAnalytics"]
}) {
  const maxContributionValue = Math.max(
    ...data.trend.flatMap((item) => [item.expected, item.received]),
    1,
  )

  return (
    <OverviewSection
      eyebrow="Contributions"
      title="Collection pacing"
      actions={
        <OverviewPill tone={data.collectionGap > 0 ? "warning" : "positive"}>
          {data.collectionGap > 0
            ? `${formatCurrency(data.collectionGap)} gap`
            : "Covered"}
        </OverviewPill>
      }
    >
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SmallStat
          label="Expected this month"
          value={formatCurrency(data.expectedThisMonth)}
        />
        <SmallStat
          label="Received this month"
          value={formatCurrency(data.receivedThisMonth)}
        />
        <SmallStat label="Paid members" value={data.paidMemberCount} />
        <SmallStat label="Unpaid members" value={data.unpaidMemberCount} />
        <SmallStat label="Staged rows" value={data.stagedMemberRowCount} />
      </dl>
      <div className="mt-5 space-y-4">
        {data.trend.map((item) => (
          <div key={item.periodKey} className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium text-foreground">
              {item.periodLabel}
            </p>
            <MoneyRow
              label="Expected"
              max={maxContributionValue}
              value={item.expected}
            />
            <MoneyRow
              label="Received"
              max={maxContributionValue}
              value={item.received}
            />
          </div>
        ))}
      </div>
    </OverviewSection>
  )
}

function FinancingAnalytics({
  data,
}: {
  data: AnalyticsSummary["financingAnalytics"]
}) {
  const maxMovementValue = Math.max(
    ...data.movementTrend.flatMap((item) => [
      item.disbursedPrincipal,
      item.repaymentsPosted,
      item.overdueScheduledAmount,
    ]),
    1,
  )

  return (
    <OverviewSection
      eyebrow="Risk"
      title="Financing movement and exposure"
      actions={
        <OverviewPill tone={getRiskTone(data.overdueAmount)}>
          {data.openCollectionCases} open cases
        </OverviewPill>
      }
    >
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SmallStat
          label="Outstanding principal"
          value={formatCurrency(data.outstandingPrincipal)}
        />
        <SmallStat
          label="Due this month"
          value={formatCurrency(data.dueThisMonthAmount)}
        />
        <SmallStat
          label="Pending disbursement"
          value={formatCurrency(data.pendingDisbursementAmount)}
        />
        <SmallStat label="Next actions due" value={data.nextActionDueCount} />
      </dl>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <OverviewTile>
          <p className="text-xs text-muted-foreground">PAR 30</p>
          <p className="mt-1 text-lg font-medium">
            {formatCurrency(data.par30Amount)}
          </p>
        </OverviewTile>
        <OverviewTile>
          <p className="text-xs text-muted-foreground">PAR 60</p>
          <p className="mt-1 text-lg font-medium">
            {formatCurrency(data.par60Amount)}
          </p>
        </OverviewTile>
        <OverviewTile>
          <p className="text-xs text-muted-foreground">PAR 90</p>
          <p className="mt-1 text-lg font-medium">
            {formatCurrency(data.par90Amount)}
          </p>
        </OverviewTile>
      </div>
      <div className="mt-5 space-y-4">
        {data.movementTrend.map((item) => (
          <div key={item.periodKey} className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium text-foreground">
              {item.periodLabel}
            </p>
            <MoneyRow
              label="Disbursed"
              max={maxMovementValue}
              value={item.disbursedPrincipal}
            />
            <MoneyRow
              label="Repaid"
              max={maxMovementValue}
              value={item.repaymentsPosted}
            />
            <MoneyRow
              label="Overdue"
              max={maxMovementValue}
              value={item.overdueScheduledAmount}
            />
          </div>
        ))}
      </div>
    </OverviewSection>
  )
}

function MemberTrustAnalytics({
  data,
}: {
  data: AnalyticsSummary["memberTrustAnalytics"]
}) {
  return (
    <OverviewSection eyebrow="Trust" title="Member and compliance watch">
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <SmallStat label="Active members" value={data.activeMemberCount} />
        <SmallStat
          label="Pending approvals"
          value={data.pendingMemberApprovals}
        />
        <SmallStat label="KYC pending" value={data.kycPendingCount} />
        <SmallStat
          label="Documents pending"
          value={data.pendingDocumentReviewCount}
        />
        <SmallStat label="Failed imports" value={data.failedImportCount} />
      </dl>
    </OverviewSection>
  )
}

function ShareProfitAnalytics({
  data,
}: {
  data: AnalyticsSummary["shareProfitAnalytics"]
}) {
  return (
    <OverviewSection eyebrow="Shares" title="Share and profit position">
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <SmallStat
          label="Share capital"
          value={formatCurrency(data.shareCapitalBalance)}
        />
        <SmallStat
          label="Active investment pools"
          value={data.activeInvestmentPoolCount}
        />
        <SmallStat
          label="Profit pending allocation"
          value={formatCurrency(data.profitPendingAllocation)}
        />
        <SmallStat
          label="Draft dividend periods"
          value={data.draftDividendPeriodCount}
        />
      </dl>
    </OverviewSection>
  )
}

export function AnalyticsView() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("last_6_months")
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(
    trpc.analytics.summary.queryOptions({ period }),
  )

  return (
    <div className="flex flex-col gap-5">
      <section className="border-b border-border pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase">
              Analytics
            </p>
            <h1 className="mt-3 text-2xl font-medium text-foreground sm:text-3xl">
              {data.workspace.tenantName} analytics
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Decision trends for collection pacing, financing exposure,
              member trust, and share-profit governance.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {analyticsPeriodOptions.map((option) => (
              <button
                className={
                  option.value === period
                    ? "inline-flex h-7 items-center border border-foreground bg-foreground px-2.5 text-xs font-medium text-background"
                    : "inline-flex h-7 items-center border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted"
                }
                key={option.value}
                onClick={() => setPeriod(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricLink
          detail="After reserves, active exposure, and approved commitments."
          href="/loans"
          label="Deployable funds"
          tone={
            data.primaryMetrics.deployableFunds > 0 ? "positive" : "warning"
          }
          value={formatCurrency(data.primaryMetrics.deployableFunds)}
        />
        <MetricLink
          detail={`${data.workspace.periodLabel} view with current-month emphasis.`}
          href="/monthly-records"
          label="Collection coverage"
          tone={getCoverageTone(data.primaryMetrics.collectionCoverage)}
          value={formatPercent(data.primaryMetrics.collectionCoverage)}
        />
        <MetricLink
          detail="Overdue exposure divided by active outstanding principal."
          href="/repayments?status=overdue"
          label="Portfolio at risk"
          tone={getRiskTone(data.primaryMetrics.portfolioAtRiskRate)}
          value={formatPercent(data.primaryMetrics.portfolioAtRiskRate)}
        />
        <MetricLink
          detail="Approvals, KYC, financing, collections, imports, and setup."
          href="/membership-approvals"
          label="Action burden"
          tone={getRiskTone(data.primaryMetrics.actionQueueTotal)}
          value={data.primaryMetrics.actionQueueTotal.toString()}
        />
        <MetricLink
          detail="Approved facilities waiting for release."
          href="/loans"
          label="Disbursement holds"
          tone={getRiskTone(data.primaryMetrics.pendingDisbursementAmount)}
          value={formatCurrency(data.primaryMetrics.pendingDisbursementAmount)}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <ContributionAnalytics data={data.contributionAnalytics} />
        <FinancingAnalytics data={data.financingAnalytics} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <MemberTrustAnalytics data={data.memberTrustAnalytics} />
        <ShareProfitAnalytics data={data.shareProfitAnalytics} />
      </section>
    </div>
  )
}
