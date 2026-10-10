"use client"

import Link from "next/link"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Button } from "@halaalvest/ui/components/button"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { useTRPC } from "@/trpc/client"

function deadlineLabel(reviewBy: string | null, now: number | null) {
  if (!reviewBy) return "Deadline needs investigation"
  const due = Date.parse(reviewBy)
  if (!Number.isFinite(due)) return "Deadline needs investigation"
  if (now === null) return "Pending review"
  if (due <= now) return "Overdue"
  if (due - now <= 2 * 60 * 60 * 1000) return "Due within 2 hours"
  return "Pending review"
}

export function PlatformStoreRefundReviewsView() {
  const trpc = useTRPC()
  const queue = useInfiniteQuery({
    ...trpc.storeRefundReviews.queue.infiniteQueryOptions(
      {},
      { getNextPageParam: ({ meta }) => meta.cursor ?? undefined }
    ),
    refetchInterval: 60_000,
  })
  const reviews = queue.data?.pages.flatMap((page) => page.data) ?? []
  const now = queue.data?.pages[0]?.asOf
    ? Date.parse(queue.data.pages[0].asOf)
    : null

  return (
    <WorkspacePageShell
      eyebrow="Platform billing"
      title="Google refund reviews"
      description="Restricted intake receipts for chargeback requests. A human response, deadline alerting and Google outcome reconciliation are not active yet. Do not enable live notifications from this page."
    >
      <Link
        className="text-sm font-medium underline underline-offset-4"
        href="/platform/privacy-requests"
      >
        Open privacy requests
      </Link>
      {queue.isPending ? <p role="status">Loading refund reviews…</p> : null}
      {queue.isError ? (
        <div className="space-y-2" role="alert">
          <p>Refund reviews could not be loaded.</p>
          <Button onClick={() => void queue.refetch()} variant="outline">
            Retry
          </Button>
        </div>
      ) : null}
      {queue.data && reviews.length === 0 ? (
        <WorkspaceEmptyState
          title="No pending refund reviews"
          body="Authenticated Google review receipts will appear here after the notification intake is configured."
        />
      ) : null}
      <div className="space-y-4">
        {reviews.map((review) => {
          const deadline = deadlineLabel(review.reviewBy, now)
          return (
            <section
              className="space-y-3 rounded-xl border border-border p-5"
              key={review.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">
                    {review.orderId ?? "Order ID needs investigation"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Google Play chargeback review
                  </p>
                </div>
                <span
                  className={
                    deadline === "Overdue" ||
                    deadline === "Deadline needs investigation"
                      ? "text-sm font-semibold text-destructive"
                      : "text-sm font-medium"
                  }
                >
                  {deadline}
                </span>
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Review by</dt>
                  <dd>
                    {review.reviewBy
                      ? new Date(review.reviewBy).toLocaleString()
                      : "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Received</dt>
                  <dd>
                    {review.receivedAt
                      ? new Date(review.receivedAt).toLocaleString()
                      : "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tracked pushes</dt>
                  <dd>{review.trackedDeliveries ?? "Not tracked"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last observed</dt>
                  <dd>
                    {review.lastObservedAt
                      ? new Date(review.lastObservedAt).toLocaleString()
                      : "Not tracked"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Account binding</dt>
                  <dd className="font-mono text-xs break-all">
                    {review.accountBinding ?? "Unresolved"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Review reference</dt>
                  <dd className="font-mono text-xs break-all">{review.id}</dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                Reason code {review.refundReason ?? "unavailable"}. Receipt
                only; no refund preference has been sent to Google.
              </p>
            </section>
          )
        })}
      </div>
      {queue.hasNextPage ? (
        <Button
          disabled={queue.isFetchingNextPage}
          onClick={() => void queue.fetchNextPage()}
          variant="outline"
        >
          {queue.isFetchingNextPage ? "Loading…" : "Load more reviews"}
        </Button>
      ) : null}
      {queue.isFetchNextPageError ? (
        <p className="text-sm text-destructive" role="alert">
          More reviews could not be loaded. Try again.
        </p>
      ) : null}
    </WorkspacePageShell>
  )
}
