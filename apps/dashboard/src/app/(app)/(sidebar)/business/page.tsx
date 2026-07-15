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
import { MembersSummaryCard } from "@/components/members"
import { BusinessSheet } from "@/components/sheets/business-sheet"
import { DataTable } from "@/components/tables/business/data-table"
import { BusinessSkeleton } from "@/components/tables/business/skeleton"
import { loadBusinessFilterParams } from "@/hooks/use-business-filter-params"
import { loadBusinessParams } from "@/hooks/use-business-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  title: "Business | Finance",
}

type BusinessSortField =
  | "name"
  | "startDate"
  | "capitalAmount"
  | "profitAmount"
  | "status"

function getSort(
  sort?: string[] | null
): [BusinessSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "name",
    "startDate",
    "capitalAmount",
    "profitAmount",
    "status",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as BusinessSortField, direction]
}

function getEnumValue<TValue extends string>(
  value: string | null,
  validValues: readonly TValue[]
) {
  return validValues.includes(value as TValue) ? (value as TValue) : undefined
}

function getBusinessesListInput(
  filters: Awaited<ReturnType<typeof loadBusinessFilterParams>>,
  sort?: string[] | null
) {
  return {
    dividendPeriodId: filters.dividendPeriodId ?? undefined,
    hasProfitEntries: filters.hasProfitEntries ?? undefined,
    profitStatus: getEnumValue(filters.profitStatus, [
      "draft",
      "pending",
      "reviewed",
      "completed",
      "approved",
      "archived",
    ] as const),
    q: filters.q ?? undefined,
    sort: getSort(sort),
    sourceType: getEnumValue(filters.sourceType, [
      "manual",
      "backfill",
      "import",
    ] as const),
    startFrom: filters.startFrom ?? undefined,
    startTo: filters.startTo ?? undefined,
    status: getEnumValue(filters.status, [
      "planned",
      "active",
      "completed",
      "archived",
    ] as const),
  }
}

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filters = await loadBusinessFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  loadBusinessParams(resolvedSearchParams)

  const [initialSettings, caller] = await Promise.all([
    getInitialTableSettings("business"),
    getServerCaller(),
  ])
  const businessListInput = getBusinessesListInput(filters, sort)
  const businessListOptions = trpc.business.list.infiniteQueryOptions(
    businessListInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )

  const data = await (async () => {
    try {
      const result = await Promise.all([
        caller.business.setup(),
        caller.business.summary(),
        caller.business.list(businessListInput),
      ])

      return { result, state: "ready" as const }
    } catch {
      return { state: "unavailable" as const }
    }
  })()

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

  const [setup, summary, initialBusinessPage] = data.result
  const distributionDetail = `${summary.pendingAllocationCount} pending - ${summary.blockedCount} need review`

  getQueryClient().setQueryData(businessListOptions.queryKey, {
    pageParams: [businessListOptions.initialPageParam],
    pages: [initialBusinessPage],
  })
  getQueryClient().setQueryData(
    trpc.business.setup.queryOptions().queryKey,
    setup
  )
  getQueryClient().setQueryData(
    trpc.business.summary.queryOptions().queryKey,
    summary
  )

  return (
    <HydrateClient>
      <ScrollableContent>
        <div className="flex flex-col gap-6">
          <CollapsibleSummary>
            <section className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
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
          </CollapsibleSummary>

          <BusinessPageTitle />

          {setup.isLocked ? (
            <div className="border-b border-border/70 pb-6 text-sm text-muted-foreground">
              Business records are locked until migration reaches live
              operations.
            </div>
          ) : null}

          <BusinessHeader
            canRecordBusiness={!setup.isLocked}
            canReviewNoProfit={setup.canReviewNoProfit}
          />

          <Suspense fallback={<BusinessSkeleton />}>
            <DataTable initialSettings={initialSettings} isLocked={setup.isLocked} />
          </Suspense>

          <BusinessSheet />
        </div>
      </ScrollableContent>
    </HydrateClient>
  )
}

function BusinessPageTitle() {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase">
        Finance
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">
        Business
      </h1>
    </div>
  )
}
