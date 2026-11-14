"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { DashboardPageShell } from "@/components/dashboard"
import { useLiveTablePollInterval } from "@/hooks/use-live-table-poll-interval"
import { usePlatformParams } from "@/hooks/use-platform-params"
import {
  formatTimeFromNow,
  getRefundReviewWord,
  plural,
} from "@/lib/platform/platform-words"
import { useTRPC } from "@/trpc/client"
import { formatDateAndTime } from "@/utils/format"
import { PlatformBadge } from "./platform-badge"
import { PlatformQueue } from "./platform-queue"
import { PlatformTabs } from "./platform-tabs"
import { RefundReviewSheet } from "./refund-review-sheet"

/** Google Play refund reviews we received, oldest (most urgent) first. */
export function RefundReviewsView() {
  const trpc = useTRPC()
  const { setParams } = usePlatformParams()
  const livePollInterval = useLiveTablePollInterval()
  const queue = useInfiniteQuery({
    ...trpc.storeRefundReviews.queue.infiniteQueryOptions(
      {},
      { getNextPageParam: ({ meta }) => meta.cursor ?? undefined }
    ),
    // "Late" and "Due soon" only need minute freshness while someone watches.
    refetchInterval: livePollInterval === false ? false : 60_000,
  })
  const reviews = queue.data?.pages.flatMap((page) => page.data) ?? []
  const asOf = queue.data?.pages[0]?.asOf
  const now = asOf ? Date.parse(asOf) : null
  const late = now
    ? reviews.filter(
        (review) => getRefundReviewWord(review.reviewBy, now).tone === "danger"
      ).length
    : 0

  return (
    <DashboardPageShell>
      <PlatformTabs />
      <p className="text-lg text-muted-foreground">
        {queue.data
          ? reviews.length
            ? `${plural(reviews.length, "review")} waiting${late ? `, ${late} late or missing a deadline` : ""}. Nothing is sent to Google from here.`
            : "Nothing is waiting."
          : "Refunds a Google Play buyer asked for."}
      </p>
      <PlatformQueue
        columns={["Order", "Status", "Answer by", "Received"]}
        empty={{
          body: "When Google asks us to review a refund, it shows here.",
          title: "No refund reviews",
        }}
        error={
          queue.isError
            ? "Refund reviews could not be loaded."
            : queue.isFetchNextPageError
              ? "More reviews could not be loaded. Try again."
              : null
        }
        hasMore={Boolean(queue.hasNextPage)}
        loading={queue.isPending}
        loadingMore={queue.isFetchingNextPage}
        onLoadMore={() => void queue.fetchNextPage()}
        onOpen={(refundReviewId) => void setParams({ refundReviewId })}
        onRetry={() => void queue.refetch()}
        rows={reviews.map((review) => ({
          badge: (
            <PlatformBadge word={getRefundReviewWord(review.reviewBy, now)} />
          ),
          cells: [
            {
              label: "Answer by",
              value: review.reviewBy
                ? `${formatDateAndTime(review.reviewBy)}${now ? ` (${formatTimeFromNow(review.reviewBy, now)})` : ""}`
                : "Not given",
            },
            {
              label: "Received",
              value:
                formatDateAndTime(review.receivedAt ?? review.occurredAt) ??
                "Not known",
            },
          ],
          id: review.id,
          subtitle: "Google Play",
          title: review.orderId ?? "Order number missing",
        }))}
      />
      <RefundReviewSheet now={now} />
    </DashboardPageShell>
  )
}
