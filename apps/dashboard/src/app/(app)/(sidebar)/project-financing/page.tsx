import {
  createDbRuntime,
  getMemberByUserId,
  getProjectFinancingSummary,
  listMembers,
  listProjectFinancingRequests,
} from "@halaalvest/db"
import {
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  MemberProjectFinancingRequestsView,
  ProjectFinancingRequestsView,
} from "@/components/project-financing-requests-view"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
} from "@/lib/workspace-access"

export default async function ProjectFinancingPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canSubmit = hasAnyRole(context.auth.membership?.role, allStaffRoles)
  const canUseMemberProjectFinancing = context.auth.membership?.role === "member"
  const canReview = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles,
  )

  if (!canSubmit && !canUseMemberProjectFinancing) {
    return (
      <WorkspacePageShell
        eyebrow="Project financing"
        title="Project financing"
        description="Track member business funding requests before accounting decisions are posted."
      >
        <WorkspaceEmptyState
          body="Project financing is available to cooperative staff and linked members."
          title="Project financing access is restricted."
        />
      </WorkspacePageShell>
    )
  }

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Project financing"
        title="Project financing"
        description="Track member business funding requests before accounting decisions are posted."
      >
        <WorkspaceEmptyState
          body="Once the database-backed environment is active, this route will show project financing requests, review status, and approved structure evidence."
          title="Project financing needs the database runtime."
        />
      </WorkspacePageShell>
    )
  }

  if (canUseMemberProjectFinancing) {
    if (!context.auth.user) {
      return (
        <WorkspacePageShell
          eyebrow="Project financing"
          title="My project financing"
          description="Request cooperative business funding and track finance review."
        >
          <WorkspaceEmptyState
            body="Sign in with your member account to request project financing."
            title="Member sign-in required."
          />
        </WorkspacePageShell>
      )
    }

    const member = await getMemberByUserId({
      tenantId: context.tenant.id,
      userId: context.auth.user.id,
    })

    if (!member) {
      return (
        <WorkspacePageShell
          eyebrow="Project financing"
          title="My project financing"
          description="Request cooperative business funding and track finance review."
        >
          <WorkspaceEmptyState
            body="Your user account is not linked to a member profile in this cooperative."
            title="Member profile not linked."
          />
        </WorkspacePageShell>
      )
    }

    const requests = await listProjectFinancingRequests({
      memberId: member.id,
      tenantId: context.tenant.id,
    })

    return (
      <WorkspacePageShell
        eyebrow="Project financing"
        title="My project financing"
        description="Request cooperative business funding and track finance review."
      >
        <MemberProjectFinancingRequestsView
          member={member}
          requests={requests}
        />
      </WorkspacePageShell>
    )
  }

  const [requests, summary, members] = await Promise.all([
    listProjectFinancingRequests({ tenantId: context.tenant.id }),
    getProjectFinancingSummary(context.tenant.id),
    listMembers(context.tenant.id, { page: 1, pageSize: 200 }),
  ])

  return (
    <WorkspacePageShell
      eyebrow="Project financing"
      title="Project financing"
      description="Stage and review member business funding requests without posting disbursements or profit allocations."
    >
      <ProjectFinancingRequestsView
        canReview={canReview}
        memberOptions={members.items.map((member) => ({
          id: member.id,
          label: `${member.fullName} (${member.memberNumber})`,
        }))}
        requests={requests}
        summary={summary}
      />
    </WorkspacePageShell>
  )
}
