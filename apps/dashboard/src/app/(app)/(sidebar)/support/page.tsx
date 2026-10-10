import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { SupportPageView } from "@/components/support-page-view"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadSupportFilterParams } from "@/hooks/use-support-filter-params"
import { loadSupportPageData } from "@/lib/support/load-support-page"
import { getSupportListInput } from "@/lib/support/support-list-input"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  title: "Support | Halaalvest",
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const filter = loadSupportFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [data, initialSettings] = await Promise.all([
    loadSupportPageData(resolvedSearchParams),
    getInitialTableSettings("support"),
  ])

  if (data.state === "staff-ready" || data.state === "member-ready") {
    const queryInput = getSupportListInput(
      filter,
      sort,
      filter.q,
      data.state === "staff-ready"
    )

    await batchPrefetch([
      trpc.support.list.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      }),
    ])
  }

  return (
    <HydrateClient>
      <SupportPageView data={data} supportInitialSettings={initialSettings} />
    </HydrateClient>
  )
}
