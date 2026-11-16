"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useQuery } from "@tanstack/react-query"
import {
  RequestFacts,
  RequestSection,
} from "@/components/requests/request-facts"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { usePlatformParams } from "@/hooks/use-platform-params"
import {
  formatTimeFromNow,
  getRefundReviewWord,
} from "@/lib/platform/platform-words"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"
import { formatDateAndTime } from "@/utils/format"
import { PlatformBadge } from "./platform-badge"

/** One Google refund review (`?refundReviewId=`). Read only. */
export function RefundReviewSheet({ now }: { now: number | null }) {
  const { refundReviewId, setParams } = usePlatformParams()

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("platformRefund", "review")}
      mobileFullScreen
      onOpenChange={(open) => {
        if (!open) void setParams({ refundReviewId: null })
      }}
      open={Boolean(refundReviewId)}
    >
      {refundReviewId ? (
        <RefundReviewContent now={now} reviewId={refundReviewId} />
      ) : null}
    </WorkflowPresentation>
  )
}

function RefundReviewContent({
  now,
  reviewId,
}: {
  now: number | null
  reviewId: string
}) {
  const trpc = useTRPC()
  const detail = useQuery(
    trpc.storeRefundReviews.review.queryOptions({ reviewId })
  )
  const review = detail.data

  return (
    <>
      <SheetHeader className="gap-1 px-4 pt-4 sm:px-6">
        <SheetTitle className="font-heading text-2xl font-semibold [overflow-wrap:anywhere]">
          {review?.orderId ?? "Refund review"}
        </SheetTitle>
        <SheetDescription className="text-base text-muted-foreground">
          Google Play refund review
        </SheetDescription>
      </SheetHeader>
      <div className="grid gap-6 px-4 pb-8 sm:px-6">
        {detail.isPending ? (
          <p className="text-lg text-muted-foreground" role="status">
            Loading…
          </p>
        ) : !review ? (
          <div className="grid justify-items-start gap-3" role="alert">
            <p className="text-lg">This review could not be loaded.</p>
            <Button
              size="touch"
              className="px-5 text-base"
              onClick={() => void detail.refetch()}
              variant="outline"
            >
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <PlatformBadge
                word={
                  review.pending
                    ? getRefundReviewWord(review.reviewBy, now)
                    : { label: "Closed", tone: "muted" }
                }
              />
              {review.pending && review.reviewBy && now !== null ? (
                <p className="text-lg font-medium">
                  Answer {formatTimeFromNow(review.reviewBy, now)}
                </p>
              ) : null}
            </div>
            <RequestFacts
              items={[
                {
                  label: "Answer by",
                  value: formatDateAndTime(review.reviewBy) ?? "Not given",
                },
                {
                  label: "Received",
                  value: formatDateAndTime(
                    review.receivedAt ?? review.occurredAt
                  ),
                },
                {
                  label: "Google reason code",
                  value: review.refundReason ?? "Not given",
                },
                {
                  label: "Times Google sent it",
                  value: review.trackedDeliveries ?? "Once",
                },
                {
                  label: "Buyer's account code",
                  value: review.accountBinding ?? "Not linked",
                },
                { label: "Review number", value: review.id },
              ]}
            />
            <RequestSection title="What to do">
              <p className="text-base">
                Look up the order in Google Play Console and answer there before
                the deadline. Nothing is sent to Google from this page, and no
                money moves here.
              </p>
            </RequestSection>
          </>
        )}
      </div>
    </>
  )
}
