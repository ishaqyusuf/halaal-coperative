import type { Metadata } from "next"
import { notFound } from "next/navigation"
import type { SearchParams } from "nuqs/server"
import { RefundReviewsView } from "@/components/platform/refund-reviews-view"
import { loadPlatformParams } from "@/hooks/use-platform-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"

export const metadata: Metadata = { title: "Refund reviews | Halaalvest" }

export default async function RefundReviewsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const context = await getDashboardServerContext()
  if (!context.auth.user?.isPlatformOwner) notFound()

  const { refundReviewId } = loadPlatformParams(await props.searchParams)
  prefetch(
    trpc.storeRefundReviews.queue.infiniteQueryOptions(
      {},
      { getNextPageParam: ({ meta }) => meta.cursor ?? undefined }
    )
  )
  if (refundReviewId) {
    prefetch(
      trpc.storeRefundReviews.review.queryOptions({ reviewId: refundReviewId })
    )
  }

  return (
    <HydrateClient>
      <RefundReviewsView />
    </HydrateClient>
  )
}
