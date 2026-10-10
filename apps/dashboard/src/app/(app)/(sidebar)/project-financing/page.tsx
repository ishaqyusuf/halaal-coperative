import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { ProjectFinancingPageView } from "@/components/project-financing-page-view"
import { loadProjectFinancingFilterParams } from "@/hooks/use-project-financing-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadProjectFinancingPageData } from "@/lib/project-financing/load-project-financing-page"
import { getProjectFinancingListInput } from "@/lib/project-financing/project-financing-list-input"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  title: "Project financing | Halaalvest",
}

export default async function ProjectFinancingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filter = loadProjectFinancingFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [data, initialSettings] = await Promise.all([
    loadProjectFinancingPageData(),
    getInitialTableSettings("projectFinancing"),
  ])
  const listOptions = trpc.projectFinancing.list.infiniteQueryOptions(
    getProjectFinancingListInput(filter, sort),
    { getNextPageParam: ({ meta }) => meta?.cursor }
  )

  if (data.state === "staff-ready" || data.state === "member-ready") {
    await batchPrefetch([listOptions])
  }

  return (
    <HydrateClient>
      <ProjectFinancingPageView
        data={data}
        projectFinancingInitialSettings={initialSettings}
      />
    </HydrateClient>
  )
}
