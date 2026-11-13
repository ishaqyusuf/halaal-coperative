import type { MemberStatementSummary } from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { DashboardStatCard } from "@/components/dashboard"
import {
  describeOtherObligations,
  describeShareCapital,
  describeSpecialSavings,
  getOtherObligationsOutstanding,
} from "@/lib/members/member-balances"

function formatIsoDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null
}

/**
 * Staff-facing member balance cards. The member detail page and the member
 * statement page render the same eight balances, so opening special savings,
 * share capital, procurement and food balances appear in both.
 */
export function MemberBalanceStatCards({
  summary,
}: {
  summary: MemberStatementSummary | null | undefined
}) {
  const otherObligations = getOtherObligationsOutstanding(summary)
  const commitmentStartsAt = formatIsoDate(summary?.activeCommitmentStartsAt)
  const lastRepaymentAt = formatIsoDate(summary?.lastRepaymentAt)

  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <DashboardStatCard
        detail={
          commitmentStartsAt
            ? `From ${commitmentStartsAt}`
            : "No active commitment plan"
        }
        label="Active commitment"
        value={formatCurrency(summary?.activeCommitmentAmount ?? 0)}
      />
      <DashboardStatCard
        detail={`${summary?.contributionsCount ?? 0} posted contribution entries`}
        label="Savings snapshot"
        tone="positive"
        value={formatCurrency(summary?.totalSavingsSnapshot ?? 0)}
      />
      <DashboardStatCard
        detail={describeSpecialSavings(summary)}
        label="Special savings"
        value={formatCurrency(summary?.specialSavingsBalance ?? 0)}
      />
      <DashboardStatCard
        detail={describeShareCapital(summary)}
        label="Share capital"
        value={formatCurrency(summary?.shareCapitalBalance ?? 0)}
      />
      <DashboardStatCard
        detail={`${summary?.activeLoanCount ?? 0} active or open loan records`}
        label="Outstanding loan balance"
        tone={summary?.totalOutstandingPrincipal ? "warning" : "default"}
        value={formatCurrency(summary?.totalOutstandingPrincipal ?? 0)}
      />
      <DashboardStatCard
        detail={describeOtherObligations(summary)}
        label="Procurement and food"
        tone={otherObligations ? "warning" : "default"}
        value={formatCurrency(otherObligations)}
      />
      <DashboardStatCard
        detail={
          lastRepaymentAt
            ? `Last repayment ${lastRepaymentAt}`
            : "No repayment recorded yet"
        }
        label="Repayments posted"
        value={formatCurrency(summary?.totalRepaymentsPosted ?? 0)}
      />
      <DashboardStatCard
        detail={`${summary?.dividendAllocationCount ?? 0} published allocations`}
        label="Published dividends"
        value={formatCurrency(summary?.totalDividendAllocations ?? 0)}
      />
    </section>
  )
}
