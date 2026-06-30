"use client"

import { formatCurrency, formatPercent } from "@halaalvest/utils"
import { OverviewActionLink } from "./overview-ui"
import {
  getCoverageTone,
  getMetricTone,
  type OverviewSummary,
} from "./overview-utils"

type WidgetCardProps = {
  detail?: string
  href: string
  label: string
  tone?: "neutral" | "positive" | "warning"
  value: string
}

function WidgetCard({
  detail,
  href,
  label,
  tone = "neutral",
  value,
}: WidgetCardProps) {
  return (
    <OverviewActionLink
      href={href}
      variant="ghost"
      className="group flex h-full min-h-[112px] flex-col items-start justify-between rounded-none border border-border bg-background p-4 text-left hover:border-foreground/20 hover:bg-muted"
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-4">
        <span className="text-2xl font-medium text-foreground">{value}</span>
        {detail ? (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {detail}
          </p>
        ) : null}
        <span
          className={
            tone === "warning"
              ? "mt-3 block h-0.5 w-8 bg-amber-300"
              : tone === "positive"
                ? "mt-3 block h-0.5 w-8 bg-emerald-300"
                : "mt-3 block h-0.5 w-8 bg-border"
          }
        />
      </div>
    </OverviewActionLink>
  )
}

export function WidgetCards({ data }: { data: OverviewSummary }) {
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <WidgetCard
        label="Deployable funds"
        href="/loans"
        value={formatCurrency(data.primaryMetrics.deployableFunds)}
        detail="After reserves, active exposure, and approved commitments."
        tone={
          data.primaryMetrics.deployableFunds > 0 ? "positive" : "warning"
        }
      />
      <WidgetCard
        label="Collection coverage"
        href="/monthly-records"
        value={formatPercent(data.primaryMetrics.collectionCoverage)}
        detail={`${formatCurrency(data.contributionHealth.receivedThisMonth)} received for ${data.contributionHealth.periodLabel}.`}
        tone={getCoverageTone(data.primaryMetrics.collectionCoverage)}
      />
      <WidgetCard
        label="Portfolio at risk"
        href="/repayments?status=overdue"
        value={formatCurrency(data.primaryMetrics.portfolioAtRiskAmount)}
        detail={`${formatPercent(data.primaryMetrics.portfolioAtRiskRate)} of active outstanding principal.`}
        tone={getMetricTone(data.primaryMetrics.portfolioAtRiskRate, 0)}
      />
      <WidgetCard
        label="Action queue"
        href="/membership-approvals"
        value={data.primaryMetrics.actionQueueTotal.toString()}
        detail="Approvals, KYC, financing, collections, imports, and setup."
        tone={getMetricTone(data.primaryMetrics.actionQueueTotal, 0)}
      />
    </div>
  )
}
