"use client"

import { formatCurrency } from "@halaalvest/utils"
import { SummaryCard } from "@/components/summary-card"
import { overdueRepaymentScheduleHref } from "@/lib/repayments/repayments-drilldown"
import type { OverviewSummary } from "./overview-utils"

export function WidgetCards({ data }: { data: OverviewSummary }) {
  const health = data.contributionHealth
  const lateAmount = data.primaryMetrics.portfolioAtRiskAmount

  return (
    <section
      aria-label="Key numbers"
      className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <SummaryCard
        detail="Ready for new loans"
        href="/loans"
        label="Money you can lend"
        tone={data.primaryMetrics.deployableFunds > 0 ? "good" : "attention"}
        value={formatCurrency(data.primaryMetrics.deployableFunds)}
      />
      <SummaryCard
        detail={
          health.state === "no_commitments"
            ? "No monthly payments set yet"
            : `of ${formatCurrency(health.expectedThisMonth)} due`
        }
        href="/monthly-records"
        label={`Paid in ${health.periodLabel}`}
        tone={health.state === "gap" ? "attention" : "good"}
        value={formatCurrency(health.receivedThisMonth)}
      />
      <SummaryCard
        detail="Still to be repaid"
        href="/loans"
        label="Loans owed"
        value={formatCurrency(data.financingRisk.outstandingPrincipal)}
      />
      <SummaryCard
        detail={lateAmount > 0 ? "Past the due date" : "Nothing is late"}
        href={overdueRepaymentScheduleHref}
        label="Late repayments"
        tone={lateAmount > 0 ? "attention" : "good"}
        value={formatCurrency(lateAmount)}
      />
    </section>
  )
}
