import { Suspense } from "react"
import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { formatCurrency } from "@halaalvest/utils"
import {
  CollapsibleSummary,
  DashboardEmptyState,
  ScrollableContent,
} from "@/components/dashboard"
import { BusinessHeader } from "@/components/business-header"
import { ShareBusinessForm } from "@/components/forms/tenant-finance-forms"
import { MembersSummaryCard } from "@/components/members"
import { DataTable } from "@/components/tables/business/data-table"
import { BusinessSkeleton } from "@/components/tables/business/skeleton"
import { loadBusinessFilterParams } from "@/hooks/use-business-filter-params"
import { loadBusinessParams } from "@/hooks/use-business-params"
import { loadBusinessPageData } from "@/lib/business"

export const metadata: Metadata = {
  title: "Business | Finance",
}

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  loadBusinessFilterParams(resolvedSearchParams)
  loadBusinessParams(resolvedSearchParams)
  const data = await loadBusinessPageData()

  if (data.state !== "ready") {
    return (
      <ScrollableContent>
        <div className="flex flex-col gap-6">
          <BusinessPageTitle />
          <DashboardEmptyState
            body="Business records could not load from the cooperative database right now."
            title="Database-backed business records are not available yet."
          />
        </div>
      </ScrollableContent>
    )
  }

  const distributionDetail = `${data.summary.pendingAllocationCount} pending - ${data.summary.blockedCount} need review`

  return (
    <ScrollableContent>
      <div className="flex flex-col gap-6">
        <CollapsibleSummary>
          <section className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            <MembersSummaryCard
              detail="Capital currently marked active."
              label="Active capital"
              value={formatCurrency(data.summary.activeCapital)}
            />
            <MembersSummaryCard
              detail="Reviewed or approved allocatable profit."
              label="Reviewed profit"
              value={formatCurrency(data.summary.reviewedProfit)}
            />
            <MembersSummaryCard
              detail="Remaining profit not yet allocated."
              label="Allocatable"
              value={formatCurrency(data.summary.allocatableProfit)}
            />
            <MembersSummaryCard
              detail={distributionDetail}
              label="Distributions"
              tone={data.summary.blockedCount > 0 ? "warning" : "default"}
              value={data.summary.publishedDistributionCount.toString()}
            />
          </section>
        </CollapsibleSummary>

        <BusinessPageTitle />

        {data.isLocked ? (
          <div className="border-b border-border/70 pb-6 text-sm text-muted-foreground">
            Business records are locked until migration reaches live operations.
          </div>
        ) : (
          <section className="border-b border-border/70 pb-6">
            <div className="max-w-5xl">
              <ShareBusinessForm
                dividendPeriods={data.dividendPeriods}
                financeStartDate={data.financeStartDate}
                profitHistoryMode
              />
            </div>
          </section>
        )}

        <BusinessHeader canReviewNoProfit={data.canReviewNoProfit} />

        <Suspense fallback={<BusinessSkeleton />}>
          <DataTable
            canReviewNoProfit={data.canReviewNoProfit}
            dividendPeriods={data.dividendPeriods}
            financeStartDate={data.financeStartDate}
            hasSourceRows={data.rows.length > 0}
            isLocked={data.isLocked}
            rows={data.rows}
          />
        </Suspense>
      </div>
    </ScrollableContent>
  )
}

function BusinessPageTitle() {
  return (
    <div>
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        Finance
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        Business
      </h1>
    </div>
  )
}
