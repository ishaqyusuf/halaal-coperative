"use client"

import type { TenantSharePolicySettings } from "@halaalvest/db"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import { ChevronRight, PlusIcon } from "lucide-react"
import { Suspense } from "react"
import { ListLoadErrorBoundary } from "@/components/list-load-error-boundary"
import { PlainListSkeleton } from "@/components/plain-list-skeleton"
import { ShareRequestSheet } from "@/components/sheets/share-request-sheet"
import { SummaryCard } from "@/components/summary-card"
import { useShareApplicationParams } from "@/hooks/use-share-application-params"
import {
  useShareRequestsParams,
  type ShareRequestsTab,
} from "@/hooks/use-share-requests-params"
import { useShareRequestsQuery } from "@/hooks/use-share-requests-query"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"
import {
  formatShareCount,
  getShareRequestStatusWord,
} from "@/lib/shares/share-words"
import { formatDayMonthYear } from "@/utils/format"

const tabs: Array<{ label: string; value: ShareRequestsTab }> = [
  { label: "Waiting", value: "waiting" },
  { label: "All requests", value: "all" },
]

function ShareRequestList() {
  const { fetchNextPage, hasNextPage, isFetchingNextPage, requests } =
    useShareRequestsQuery()
  const { shareRequests } = useShareRequestsParams()
  const { setParams } = useShareApplicationParams()

  if (!requests.length) {
    return (
      <p className="border-y border-border py-10 text-center text-lg">
        {shareRequests === "waiting"
          ? "Nothing is waiting for review."
          : "No share requests yet."}
      </p>
    )
  }

  return (
    <div>
      <ul className="divide-y divide-border border-y border-border">
        {requests.map((request) => {
          const status = getShareRequestStatusWord(request.status)

          return (
            <li key={request.id}>
              <button
                className="flex min-h-11 w-full items-center gap-3 px-1 py-4 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:gap-4 sm:px-3"
                onClick={() =>
                  void setParams({
                    shareApplicationId: request.id,
                    shareApplicationSheetType: "details",
                  })
                }
                type="button"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold break-words">
                    {request.memberName}
                  </span>
                  <span className="block text-base text-muted-foreground">
                    {formatShareCount(request.requestedUnits)} · asked{" "}
                    {formatDayMonthYear(request.createdAt)}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-lg font-semibold tabular-nums">
                    {formatCurrency(request.shareValueSnapshot)}
                  </span>
                  <Badge
                    className={`text-sm ${memberStateToneClassNames[status.tone]}`}
                    variant="outline"
                  >
                    {request.status === "pending" ? "Review" : status.label}
                  </Badge>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground"
                />
              </button>
            </li>
          )
        })}
      </ul>
      {hasNextPage ? (
        <div className="flex justify-center pt-4">
          <Button
            size="touch"
            className="w-full text-base sm:w-auto"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
            type="button"
            variant="outline"
          >
            {isFetchingNextPage ? "Loading…" : "Show more"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** Finance staff: share requests to approve, and the cooperative's share capital. */
export function StaffShareRequestsView({
  pendingCount,
  policy,
  shareCapital,
}: {
  pendingCount: number
  policy: TenantSharePolicySettings
  shareCapital: number
}) {
  const { setParams: setShareParams } = useShareApplicationParams()
  const { setParams, shareRequests } = useShareRequestsParams()
  const isUnitBased = policy.configurationMode === "unit_based"

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {isUnitBased ? (
          <SummaryCard
            detail={pendingCount ? "Requests to decide" : "All done"}
            label="Waiting"
            onClick={() => void setParams({ shareRequests: "waiting" })}
            selected={shareRequests === "waiting"}
            tone={pendingCount ? "attention" : "good"}
            value={pendingCount.toLocaleString("en-NG")}
          />
        ) : null}
        <SummaryCard
          detail="Paid in by all members"
          label="Share capital"
          value={formatCurrency(shareCapital)}
        />
      </div>

      {isUnitBased ? (
        <div className="grid gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div
              aria-label="Share requests"
              className="flex gap-x-1 border-b border-border"
              role="tablist"
            >
              {tabs.map((tab) => {
                const selected = tab.value === shareRequests

                return (
                  <Button
                    size="touch"
                    aria-controls="share-requests-list"
                    aria-selected={selected}
                    className={cn(
                      "shrink-0 rounded-none border-b-2 px-3 text-base shadow-none",
                      selected
                        ? "border-b-foreground font-semibold text-foreground"
                        : "border-transparent text-muted-foreground"
                    )}
                    id={`share-requests-${tab.value}-tab`}
                    key={tab.value}
                    onClick={() => void setParams({ shareRequests: tab.value })}
                    role="tab"
                    type="button"
                    variant="ghost"
                  >
                    {tab.label}
                  </Button>
                )
              })}
            </div>
            <Button
              size="touch"
              className="w-full text-base sm:w-auto"
              onClick={() =>
                void setShareParams({
                  shareApplicationId: null,
                  shareApplicationSheetType: "create",
                })
              }
              type="button"
              variant="outline"
            >
              <PlusIcon data-icon="inline-start" />
              Add a request
            </Button>
          </div>
          <div
            aria-labelledby={`share-requests-${shareRequests}-tab`}
            id="share-requests-list"
            role="tabpanel"
          >
            <ListLoadErrorBoundary>
              <Suspense fallback={<PlainListSkeleton />}>
                <ShareRequestList />
              </Suspense>
            </ListLoadErrorBoundary>
          </div>
          <p className="text-base text-muted-foreground">
            {formatCurrency(policy.unitAmount)} per share, up to{" "}
            {formatShareCount(policy.maximumShareUnits)} each.{" "}
            <Link
              className="font-medium text-foreground underline underline-offset-4"
              href="/settings/finance/shares"
            >
              Share settings
            </Link>
          </p>
        </div>
      ) : (
        <div className="grid gap-3 border-y border-border py-6">
          <p className="text-lg">
            Members build their shares with each monthly payment, so there are
            no requests to review.
          </p>
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "touch" }),
              "w-full text-base sm:w-auto sm:justify-self-start"
            )}
            href="/settings/finance/shares"
          >
            Share settings
          </Link>
        </div>
      )}

      <ShareRequestSheet canReview unitAmount={policy.unitAmount} />
    </div>
  )
}
