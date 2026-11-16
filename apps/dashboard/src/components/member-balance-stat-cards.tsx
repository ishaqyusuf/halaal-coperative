import type { MemberStatementSummary } from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { DashboardStatCard } from "@/components/dashboard"
import {
  describeApprovedNotPaidOut,
  describeOtherObligations,
  describeSpecialSavings,
  getOtherObligationsOutstanding,
} from "@/lib/members/member-balances"

function BalanceGroup({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {children}
      </div>
    </section>
  )
}

/**
 * Staff-facing member balances. The member detail page and the member
 * statement show the same numbers, split into what the member has and what
 * they owe. All values come from `MemberStatementSummary`.
 */
export function MemberBalanceStatCards({
  summary,
}: {
  summary: MemberStatementSummary | null | undefined
}) {
  const otherObligations = getOtherObligationsOutstanding(summary)
  const loanCount = summary?.activeLoanCount ?? 0

  return (
    <div className="flex flex-col gap-6">
      <BalanceGroup title="What they have">
        <DashboardStatCard
          label="Savings"
          tone="positive"
          value={formatCurrency(summary?.totalSavingsSnapshot ?? 0)}
        />
        <DashboardStatCard
          detail={describeSpecialSavings(summary)}
          label="Special savings"
          value={formatCurrency(summary?.specialSavingsBalance ?? 0)}
        />
        <DashboardStatCard
          label="Shares"
          value={formatCurrency(summary?.shareCapitalBalance ?? 0)}
        />
        <DashboardStatCard
          label="Profit shared"
          value={formatCurrency(summary?.totalDividendAllocations ?? 0)}
        />
      </BalanceGroup>
      <BalanceGroup title="What they owe">
        <DashboardStatCard
          detail={
            loanCount
              ? `${loanCount} ${loanCount === 1 ? "loan" : "loans"}`
              : "No loan"
          }
          label="Loans"
          tone={summary?.totalOutstandingPrincipal ? "warning" : "default"}
          value={formatCurrency(summary?.totalOutstandingPrincipal ?? 0)}
        />
        {summary?.approvedNotPaidOutCount ? (
          <DashboardStatCard
            detail={describeApprovedNotPaidOut(summary)}
            label="Approved, not yet paid out"
            value={formatCurrency(summary.approvedNotPaidOutAmount)}
          />
        ) : null}
        <DashboardStatCard
          detail={
            otherObligations ? describeOtherObligations(summary) : undefined
          }
          label="Procurement and food"
          tone={otherObligations ? "warning" : "default"}
          value={formatCurrency(otherObligations)}
        />
      </BalanceGroup>
    </div>
  )
}
