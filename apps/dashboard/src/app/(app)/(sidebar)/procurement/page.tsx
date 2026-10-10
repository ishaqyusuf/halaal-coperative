import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { ProcurementPageView } from "@/components/procurement-page-view"
import { loadProcurementFilterParams } from "@/hooks/use-procurement-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadProcurementPageData } from "@/lib/procurement/load-procurement-page"
import { getProcurementListInput } from "@/lib/procurement/procurement-list-input"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  title: "Procurement | Halaalvest",
}

export default async function ProcurementPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filter = loadProcurementFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [data, initialSettings] = await Promise.all([
    loadProcurementPageData(),
    getInitialTableSettings("procurement"),
  ])
  const queryInput = getProcurementListInput(filter, sort)
  const listOptions = trpc.procurement.list.infiniteQueryOptions(queryInput, {
    getNextPageParam: ({ meta }) => meta?.cursor,
  })

  if (data.state === "staff-ready" || data.state === "member-ready") {
    await batchPrefetch([listOptions])
  }

  return (
    <HydrateClient>
      <ProcurementPageView
        data={data}
        procurementInitialSettings={initialSettings}
      />
    </HydrateClient>
  )
}
