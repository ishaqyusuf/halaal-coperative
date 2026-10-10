import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { RepaymentsPageView } from "@/components/repayments-page-view"
import { loadRepaymentsFilterParams } from "@/hooks/use-repayments-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadRepaymentsPageData } from "@/lib/repayments/load-repayments-page"
import {
  getRepaymentHistoryListInput,
  getRepaymentScheduleListInput,
} from "@/lib/repayments/repayments-list-input"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  title: "Repayments | Halaalvest",
}

export default async function RepaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filters = loadRepaymentsFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const view = filters.view ?? "collections"
  const [data, scheduleSettings, historySettings] = await Promise.all([
    loadRepaymentsPageData(),
    getInitialTableSettings("repaymentSchedule"),
    getInitialTableSettings("repaymentHistory"),
  ])

  if (data.state === "ready") {
    const activeListOptions =
      view === "history"
        ? trpc.repayments.history.infiniteQueryOptions(
            getRepaymentHistoryListInput(filters, sort),
            { getNextPageParam: ({ meta }) => meta?.cursor }
          )
        : trpc.repayments.schedule.infiniteQueryOptions(
            getRepaymentScheduleListInput(filters, sort, {
              collectionsOnly: view === "collections",
            }),
            { getNextPageParam: ({ meta }) => meta?.cursor }
          )

    await batchPrefetch([
      activeListOptions,
      trpc.filters.repayments.queryOptions(),
    ])
  }

  return (
    <HydrateClient>
      <RepaymentsPageView
        data={data}
        historyInitialSettings={historySettings}
        scheduleInitialSettings={scheduleSettings}
      />
    </HydrateClient>
  )
}
