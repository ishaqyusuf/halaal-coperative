"use client"

import type {
  MemberShareApplicationRow,
  MemberShareSummary,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { formatCurrency } from "@halaalvest/utils"
import { ChevronRight, PlusIcon } from "lucide-react"
import { ShareRequestSheet } from "@/components/sheets/share-request-sheet"
import { SummaryCard } from "@/components/summary-card"
import { useShareApplicationParams } from "@/hooks/use-share-application-params"
import { memberStateToneClassNames } from "@/lib/members/member-status-words"
import {
  formatShareCount,
  getRemainingShares,
  getShareRequestStatusWord,
} from "@/lib/shares/share-words"
import { formatDayMonthYear } from "@/utils/format"

/** A member's shares, their requests and (separately) profit paid to them. */
export function MemberSharesView({
  policy,
  requestBlocked,
  requests,
  summary,
}: {
  policy: TenantSharePolicySettings
  requestBlocked: boolean
  requests: MemberShareApplicationRow[]
  summary: MemberShareSummary
}) {
  const { setParams } = useShareApplicationParams()
  const position = summary.unitPosition
  const remainingShares = position ? getRemainingShares(position) : 0
  const requestBlockedReason = requestBlocked
    ? "You can ask for more shares once the office finishes setting up your account."
    : remainingShares === 0 && position
      ? `You have reached the limit of ${formatShareCount(position.maximumUnits)}.`
      : null

  return (
    <div className="grid gap-8">
      <section aria-labelledby="your-shares" className="grid gap-4">
        <h2 className="sr-only" id="your-shares">
          Your shares
        </h2>
        {position ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="col-span-2 sm:col-span-1">
              <SummaryCard
                detail={`Worth ${formatCurrency(position.totalApprovedValue)}`}
                label="Shares you own"
                tone="good"
                value={position.totalApprovedUnits.toLocaleString("en-NG")}
              />
            </div>
            <SummaryCard
              compact
              detail={
                position.pendingOptionalUnits
                  ? formatCurrency(
                      position.pendingOptionalUnits * position.unitAmount
                    )
                  : "None"
              }
              label="Waiting"
              tone={position.pendingOptionalUnits ? "attention" : "default"}
              value={position.pendingOptionalUnits.toLocaleString("en-NG")}
            />
            <SummaryCard
              compact
              detail="Share money received"
              label="Paid in"
              value={formatCurrency(summary.shareCapital)}
            />
          </div>
        ) : (
          <SummaryCard
            detail="It grows with your monthly payments."
            label="Your share capital"
            tone="good"
            value={formatCurrency(summary.shareCapital)}
          />
        )}

        {position ? (
          <div className="grid gap-2">
            <Button
              className="h-11 w-full text-base sm:w-auto sm:justify-self-start"
              disabled={Boolean(requestBlockedReason)}
              onClick={() =>
                void setParams({
                  shareApplicationId: null,
                  shareApplicationSheetType: "member-create",
                })
              }
              type="button"
            >
              <PlusIcon data-icon="inline-start" />
              Buy more shares
            </Button>
            <p className="text-base text-muted-foreground">
              {requestBlockedReason ??
                `${formatCurrency(position.unitAmount)} per share. You can ask for up to ${formatShareCount(remainingShares)}.`}
            </p>
          </div>
        ) : null}
      </section>

      {position ? (
        <section aria-labelledby="your-requests" className="grid gap-3">
          <h2 className="text-xl font-semibold" id="your-requests">
            Your requests
          </h2>
          {requests.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {requests.map((request) => {
                const status = getShareRequestStatusWord(request.status)

                return (
                  <li key={request.id}>
                    <button
                      className="flex min-h-11 w-full items-center gap-3 px-1 py-4 text-left hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
                      onClick={() =>
                        void setParams({
                          shareApplicationId: request.id,
                          shareApplicationSheetType: "details",
                        })
                      }
                      type="button"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-lg font-semibold">
                          {formatShareCount(request.requestedUnits)}
                        </span>
                        <span className="block text-base text-muted-foreground">
                          Asked on {formatDayMonthYear(request.createdAt)}
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
                          {status.label}
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
          ) : (
            <p className="border-y border-border py-6 text-base text-muted-foreground">
              You have not asked for more shares yet.
            </p>
          )}
        </section>
      ) : null}

      {summary.profitPaid.count ? (
        <section aria-labelledby="profit-paid" className="grid gap-3">
          <h2 className="text-xl font-semibold" id="profit-paid">
            Profit
          </h2>
          <SummaryCard
            detail={`From ${summary.profitPaid.count} shared ${summary.profitPaid.count === 1 ? "result" : "results"}. Past profit does not promise future profit.`}
            label="Profit shared with you"
            value={formatCurrency(summary.profitPaid.total)}
          />
        </section>
      ) : null}

      <ShareRequestSheet
        canReview={false}
        remainingShares={remainingShares}
        requestBlockedReason={requestBlockedReason}
        unitAmount={policy.unitAmount}
      />
    </div>
  )
}
