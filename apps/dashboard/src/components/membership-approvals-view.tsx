import { Suspense } from "react"
import {
  CollapsibleSummary,
  DashboardEmptyState,
  ScrollableContent,
} from "@/components/dashboard"
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
        body="Once the database runtime is configured, verified signup requests will appear here for cooperative review."
        title="Membership approvals need the database runtime."
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
  return (
    <ScrollableContent>
      <div className="flex flex-col gap-6">
        {canManage ? (
          <div className="hidden md:block">
            <CollapsibleSummary>
              <Suspense fallback={<MembershipApprovalsSummarySkeleton />}>
                <MembershipApprovalsSummary />
              </Suspense>
            </CollapsibleSummary>
          </div>
        ) : null}

        <MembershipApprovalsHeader
          showLinkGenerator={showLinkGenerator && canManage}
        />

        {canManage ? (
          <Suspense
            fallback={
              <MembershipApprovalsSkeleton
                initialSettings={initialTableSettings}
              />
            }
          >
            <MembershipApprovalsDataView
              initialSettings={initialTableSettings}
            />
          </Suspense>
        ) : (
          <DashboardEmptyState
            body="Cooperative admins and operations officers can review and approve member signups from this queue."
            title="Approval access is limited to member-management roles."
          />
        )}
      </div>
    </ScrollableContent>
  )
}
