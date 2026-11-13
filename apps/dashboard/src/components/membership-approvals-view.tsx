import { Suspense } from "react"
import { DashboardEmptyState, ScrollableContent } from "@/components/dashboard"
import { MembershipApprovalsHeader } from "@/components/membership-approvals-header"
import {
  MembershipApprovalsSummary,
  MembershipApprovalsSummarySkeleton,
} from "@/components/membership-approvals-summary"
import { MembershipApprovalsDataView } from "@/components/tables/membership-approvals/data-view"
import { MembershipApprovalsSkeleton } from "@/components/tables/membership-approvals/skeleton"
import type { TableSettings } from "@/utils/table-settings"

export function MembershipApprovalsUnavailableView() {
  return (
    <ScrollableContent>
      <DashboardEmptyState
        body="Try again in a moment."
        title="Approvals are not available right now"
      />
    </ScrollableContent>
  )
}

export function MembershipApprovalsView({
  canManage,
  initialTableSettings,
  showLinkGenerator,
}: {
  canManage: boolean
  initialTableSettings: Partial<TableSettings>
  showLinkGenerator: boolean
}) {
  if (!canManage) {
    return (
      <ScrollableContent>
        <DashboardEmptyState
          body="Ask a cooperative admin to give you member access."
          title="You cannot approve members"
        />
      </ScrollableContent>
    )
  }

  // The review sheet is mounted once in GlobalSheets (?membershipRequestId=).
  return (
    <ScrollableContent>
      <div className="flex flex-col gap-5">
        <Suspense fallback={<MembershipApprovalsSummarySkeleton />}>
          <MembershipApprovalsSummary />
        </Suspense>

        <MembershipApprovalsHeader showLinkGenerator={showLinkGenerator} />

        <Suspense
          fallback={
            <MembershipApprovalsSkeleton initialSettings={initialTableSettings} />
          }
        >
          <MembershipApprovalsDataView initialSettings={initialTableSettings} />
        </Suspense>
      </div>
    </ScrollableContent>
  )
}
