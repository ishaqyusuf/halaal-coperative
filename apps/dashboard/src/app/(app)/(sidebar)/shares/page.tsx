import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { MemberSharesPageView } from "@/components/member-shares-page-view"
import { loadShareApplicationFilterParams } from "@/hooks/use-share-application-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadMemberSharesPageData } from "@/lib/shares/load-member-shares-page"
import { getShareApplicationListInput } from "@/lib/shares/share-application-list-input"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  title: "My shares | HalaalVest",
}

export default async function MemberSharesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filter = loadShareApplicationFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [data, shareApplicationInitialSettings] = await Promise.all([
    loadMemberSharesPageData(),
    getInitialTableSettings("shareApplications"),
  ])

  const queryInput = getShareApplicationListInput({ filter, sort })
  const listOptions = trpc.shareApplications.list.infiniteQueryOptions(
    queryInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )

  if (data.state === "ready") {
    await batchPrefetch([listOptions])
  }

  return (
    <HydrateClient>
      <MemberSharesPageView
        data={data}
        shareApplicationInitialSettings={shareApplicationInitialSettings}
      />
    </HydrateClient>
  )
}
