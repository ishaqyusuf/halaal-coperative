import { DashboardActionLink } from "@/components/dashboard"
import { MembershipApprovalColumnVisibility } from "@/components/membership-approval-column-visibility"
import { MembershipApprovalsMobileToolbar } from "@/components/membership-approvals-mobile-toolbar"
import { MembershipApprovalsSearchFilter } from "@/components/membership-approvals-search-filter"

export function MembershipApprovalsHeader({
  showLinkGenerator,
}: {
  showLinkGenerator: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="hidden items-center justify-between gap-4 md:flex">
        <MembershipApprovalsSearchFilter />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {showLinkGenerator ? (
            <DashboardActionLink href="/member-signup-links">
              Open link generator
            </DashboardActionLink>
          ) : null}
          <MembershipApprovalColumnVisibility />
        </div>
      </div>

      <MembershipApprovalsMobileToolbar showLinkGenerator={showLinkGenerator} />
    </div>
  )
}
