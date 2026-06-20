import {
  createDbRuntime,
  getMembershipApprovalFilterMetadata,
  getTenantMemberSignupSettings,
  listMemberOnboardingRequests,
} from "@halaalvest/db"
import {
  DashboardDataTable,
  DashboardActionLink,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  TrendPill,
} from "@/components/dashboard"
import { MembershipApprovalsHeader } from "@/components/membership-approvals-header"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { loadMembershipApprovalsFilterParams } from "@/hooks/use-membership-approvals-filter-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"

export default async function MembershipApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = loadMembershipApprovalsFilterParams(await searchParams)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManage = hasAnyRole(context.auth.membership?.role, memberManagementRoles)
  const search = params.search ?? undefined
  const status =
    params.status &&
    ["pending_email_verification", "pending_approval", "approved", "rejected", "cancelled"].includes(params.status)
      ? params.status
      : undefined

  if (!context.tenant || runtime.status !== "database-configured") {
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

  const [filterList, requests, signupSettings] = await Promise.all([
    getMembershipApprovalFilterMetadata(),
    listMemberOnboardingRequests(context.tenant.id, {
      page: 1,
      pageSize: 50,
      search,
      status: status as never,
    }),
    getTenantMemberSignupSettings(context.tenant.id),
  ])

  return (
    <WorkspacePageShell
      eyebrow="Membership"
      title="Membership approvals"
      description="Review verified member signups, confirm identity details, and approve final dashboard access."
    >
      <section className="grid gap-4 md:grid-cols-4">
        <DashboardStatCard label="Pending approval" value={requests.items.filter((item) => item.status === "pending_approval").length.toString()} detail="Verified signups waiting for staff approval." tone="warning" />
        <DashboardStatCard label="Awaiting verification" value={requests.items.filter((item) => item.status === "pending_email_verification").length.toString()} detail="Accounts that still need email verification." />
        <DashboardStatCard label="Approved" value={requests.items.filter((item) => item.status === "approved").length.toString()} detail="Requests already converted into members." tone="positive" />
        <DashboardStatCard label="Rejected" value={requests.items.filter((item) => item.status === "rejected").length.toString()} detail="Requests closed by staff review." />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Queue"
          title="Membership request queue"
          description="Use search and status filters to focus on the requests that still need action."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {signupSettings.memberSignupAccessMode !== "public" ? (
                <DashboardActionLink href="/member-signup-links">
                  Open link generator
                </DashboardActionLink>
              ) : null}
              <TrendPill>{requests.total} requests</TrendPill>
            </div>
          }
        />

        <div className="mt-5">
          <MembershipApprovalsHeader filterList={filterList} />
        </div>

        {canManage ? (
          <div className="mt-5">
            <DashboardDataTable>
              <DashboardTable>
                <DashboardTableHead>
                  <DashboardTableHeaderCell>Applicant</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Cooperative number</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Phone</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Verification</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Submitted</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Action</DashboardTableHeaderCell>
                </DashboardTableHead>
                <DashboardTableBody>
                  {requests.items.map((request) => (
                    <DashboardTableRow key={request.id}>
                      <DashboardTableCell>
                        <div>
                          <p className="font-medium text-foreground">{request.fullName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{request.email}</p>
                        </div>
                      </DashboardTableCell>
                      <DashboardTableCell>{request.memberNumber}</DashboardTableCell>
                      <DashboardTableCell>{request.phoneNumber ?? "No phone"}</DashboardTableCell>
                      <DashboardTableCell>
                        <TrendPill tone={request.emailVerifiedAt ? "positive" : "warning"}>
                          {request.emailVerifiedAt ? "Verified" : "Pending"}
                        </TrendPill>
                      </DashboardTableCell>
                      <DashboardTableCell>
                        <TrendPill tone={request.status === "approved" ? "positive" : request.status === "rejected" ? "warning" : "neutral"}>
                          {request.status.replace(/_/g, " ")}
                        </TrendPill>
                      </DashboardTableCell>
                      <DashboardTableCell>{request.createdAt.toISOString().slice(0, 10)}</DashboardTableCell>
                      <DashboardTableCell>
                        <DashboardActionLink href={`/membership-approvals/${request.id}`}>
                          Review
                        </DashboardActionLink>
                      </DashboardTableCell>
                    </DashboardTableRow>
                  ))}
                </DashboardTableBody>
              </DashboardTable>
            </DashboardDataTable>
          </div>
        ) : (
          <WorkspaceEmptyState
            title="Approval access is limited to member-management roles."
            body="Tenant admins and operations officers can review and approve member signups from this queue."
          />
        )}
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
