import type { PageFilterData } from "@halaalvest/utils"
import {
  DashboardActionLink,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { MembershipApprovalColumnVisibility } from "@/components/membership-approval-column-visibility"
import { MembershipApprovalsHeader } from "@/components/membership-approvals-header"
import { MembershipApprovalsDataTable } from "@/components/tables/membership-approvals/data-table"
import type { TableSettings } from "@/utils/table-settings"

export function MembershipApprovalsUnavailableView() {
  return (
    <WorkspacePageShell
      eyebrow="Membership"
      title="Membership approvals"
      description="Review member signup requests after email verification and complete final cooperative approval."
    >
      <WorkspaceEmptyState
        title="Membership approvals need the database runtime."
        body="Once the database runtime is configured, verified signup requests will appear here for cooperative review."
      />
    </WorkspacePageShell>
  )
}

export function MembershipApprovalsView({
  approvedCount,
  awaitingVerificationCount,
  canManage,
  filterList,
  initialTableSettings,
  pendingApprovalCount,
  rejectedCount,
  showLinkGenerator,
  total,
}: {
  approvedCount: number
  awaitingVerificationCount: number
  canManage: boolean
  filterList: PageFilterData[]
  initialTableSettings: Partial<TableSettings>
  pendingApprovalCount: number
  rejectedCount: number
  showLinkGenerator: boolean
  total: number
}) {
  return (
    <WorkspacePageShell
      description="Review verified member signups, confirm identity details, and approve final dashboard access."
      eyebrow="Membership"
      title="Membership approvals"
    >
      <section className="grid gap-4 md:grid-cols-4">
        <DashboardStatCard
          detail="Verified signups waiting for staff approval."
          label="Pending approval"
          tone="warning"
          value={pendingApprovalCount.toString()}
        />
        <DashboardStatCard
          detail="Accounts that still need email verification."
          label="Awaiting verification"
          value={awaitingVerificationCount.toString()}
        />
        <DashboardStatCard
          detail="Requests already converted into members."
          label="Approved"
          tone="positive"
          value={approvedCount.toString()}
        />
        <DashboardStatCard
          detail="Requests closed by staff review."
          label="Rejected"
          value={rejectedCount.toString()}
        />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {showLinkGenerator ? (
                <DashboardActionLink href="/member-signup-links">
                  Open link generator
                </DashboardActionLink>
              ) : null}
              <MembershipApprovalColumnVisibility />
              <TrendPill>{total} requests</TrendPill>
            </div>
          }
          description="Use search and status filters to focus on the requests that still need action."
          eyebrow="Queue"
          title="Membership request queue"
        />

        <div className="mt-5">
          <MembershipApprovalsHeader filterList={filterList} />
        </div>

        {canManage ? (
          <div className="mt-5">
            <MembershipApprovalsDataTable
              initialSettings={initialTableSettings}
            />
          </div>
        ) : (
          <WorkspaceEmptyState
            body="Cooperative admins and operations officers can review and approve member signups from this queue."
            title="Approval access is limited to member-management roles."
          />
        )}
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
