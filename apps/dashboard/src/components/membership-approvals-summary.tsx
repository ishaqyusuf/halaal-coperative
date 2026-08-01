"use client"

import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { useSuspenseQuery } from "@tanstack/react-query"
import { DashboardStatCard } from "@/components/dashboard"
import { useTRPC } from "@/trpc/client"

export function MembershipApprovalsSummary() {
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(
    trpc.onboarding.membershipApprovalSummary.queryOptions()
  )

  return (
    <section className="grid gap-4 md:grid-cols-4">
      <DashboardStatCard
        detail="Verified signups waiting for staff approval."
        label="Pending approval"
        tone="warning"
        value={data.pendingApprovalCount.toString()}
      />
      <DashboardStatCard
        detail="Accounts that still need email verification."
        label="Awaiting verification"
        value={data.awaitingVerificationCount.toString()}
      />
      <DashboardStatCard
        detail="Requests already converted into members."
        label="Approved"
        tone="positive"
        value={data.approvedCount.toString()}
      />
      <DashboardStatCard
        detail={`${data.total} total membership requests.`}
        label="Rejected"
        value={data.rejectedCount.toString()}
      />
    </section>
  )
}

export function MembershipApprovalsSummarySkeleton() {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      {["pending", "verification", "approved", "rejected"].map((item) => (
        <div
          className="space-y-3 rounded-lg border border-border bg-card p-4"
          key={item}
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </section>
  )
}
