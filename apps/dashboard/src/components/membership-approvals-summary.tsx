"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { useSuspenseQuery } from "@tanstack/react-query"
import { useMembershipApprovalsFilterParams } from "@/hooks/use-membership-approvals-filter-params"
import { useTRPC } from "@/trpc/client"

// One plain line instead of four stat cards: how many people wait for a
// decision, and a tap that shows only them.
export function MembershipApprovalsSummary() {
  const trpc = useTRPC()
  const { filter, setFilter } = useMembershipApprovalsFilterParams()
  const { data } = useSuspenseQuery(
    trpc.onboarding.membershipApprovalSummary.queryOptions()
  )
  const waiting = data.pendingApprovalCount
  const showingWaiting = filter.status === "pending_approval"

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="text-lg">
        <span className="font-semibold">{waiting}</span>{" "}
        {waiting === 1 ? "person is" : "people are"} waiting for approval
        {data.awaitingVerificationCount > 0
          ? ` · ${data.awaitingVerificationCount} still to confirm their email`
          : ""}
      </p>
      {waiting > 0 ? (
        <Button
          className="h-11 md:h-10"
          onClick={() =>
            void setFilter({
              status: showingWaiting ? null : "pending_approval",
            })
          }
          variant="outline"
        >
          {showingWaiting ? "Show everyone" : "Show only them"}
        </Button>
      ) : null}
    </div>
  )
}

export function MembershipApprovalsSummarySkeleton() {
  return <Skeleton className="h-7 w-full max-w-md" />
}
