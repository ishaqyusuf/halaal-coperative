import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { SharesPageView } from "@/components/shares-page-view"
import { loadShareRequestsParams } from "@/hooks/use-share-requests-params"
import { loadSharesPageData } from "@/lib/shares/load-shares-page"
import { getShareRequestListInput } from "@/lib/shares/share-request-list-input"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"

export const metadata: Metadata = {
  title: "Shares | Halaalvest",
}

export default async function SharesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { shareRequests } = loadShareRequestsParams(await searchParams)
  const data = await loadSharesPageData()

  // Staff review the request list on the client; members get theirs inline.
  if (
    data.state === "staff" &&
    data.policy.configurationMode === "unit_based"
  ) {
    batchPrefetch([
      trpc.shareApplications.list.infiniteQueryOptions(
        getShareRequestListInput(shareRequests),
        { getNextPageParam: ({ meta }) => meta?.cursor }
      ),
    ])
  }

  return (
    <HydrateClient>
      <SharesPageView data={data} />
    </HydrateClient>
  )
}
