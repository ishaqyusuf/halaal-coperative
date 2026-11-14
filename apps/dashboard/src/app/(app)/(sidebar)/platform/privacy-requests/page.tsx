import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { SearchParams } from "nuqs/server"
import { PrivacyRequestsView } from "@/components/platform/privacy-requests-view"
import { loadPlatformParams } from "@/hooks/use-platform-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"

export const metadata: Metadata = { title: "Privacy requests | Halaalvest" }

export default async function PrivacyRequestsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const context = await getDashboardServerContext()
  if (!context.auth.user?.isPlatformOwner) notFound()

  const { privacyRequestId } = loadPlatformParams(await props.searchParams)
  prefetch(
    trpc.accountPrivacy.operatorQueue.infiniteQueryOptions(
      {},
      { getNextPageParam: ({ meta }) => meta.cursor ?? undefined }
    )
  )
  if (privacyRequestId) {
    prefetch(
      trpc.accountPrivacy.operatorRequest.queryOptions({
        requestId: privacyRequestId,
      })
    )
  }

  return (
    <HydrateClient>
      <PrivacyRequestsView />
    </HydrateClient>
  )
}
