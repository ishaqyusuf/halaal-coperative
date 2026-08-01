"use client"

import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { formatCurrency } from "@halaalvest/utils"
import { useSuspenseQuery } from "@tanstack/react-query"
import { MembersSummaryCard } from "@/components/members"
import { useTRPC } from "@/trpc/client"

export function BusinessSummary() {
  const trpc = useTRPC()
  const { data: summary } = useSuspenseQuery(
    trpc.business.summary.queryOptions()
  )
  const distributionDetail = `${summary.pendingAllocationCount} pending · ${summary.blockedCount} need review`

  return (
    <section className="grid grid-cols-2 gap-6 pt-6 lg:grid-cols-4">
      <MembersSummaryCard
        detail="Capital currently marked active."
        label="Active capital"
        value={formatCurrency(summary.activeCapital)}
      />
      <MembersSummaryCard
        detail="Reviewed or approved allocatable profit."
        label="Reviewed profit"
        value={formatCurrency(summary.reviewedProfit)}
      />
      <MembersSummaryCard
        detail="Remaining profit not yet allocated."
        label="Allocatable"
        value={formatCurrency(summary.allocatableProfit)}
      />
      <MembersSummaryCard
        detail={distributionDetail}
        label="Distributions"
        tone={summary.blockedCount > 0 ? "warning" : "default"}
        value={summary.publishedDistributionCount.toString()}
      />
    </section>
  )
}

export function BusinessSummarySkeleton() {
  return (
    <section className="grid grid-cols-2 gap-6 pt-6 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="min-h-28 border border-border p-4" key={index}>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="mt-3 h-4 w-28" />
          <Skeleton className="mt-2 h-3 w-full" />
        </div>
      ))}
    </section>
  )
}
