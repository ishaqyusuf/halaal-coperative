import {
  createDbRuntime,
  getMemberByUserId,
  getProcurementSummary,
  listMembers,
  listProcurementRequests,
} from "@halaalvest/db"
import {
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  MemberProcurementRequestsView,
  ProcurementRequestsView,
} from "@/components/procurement-requests-view"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
} from "@/lib/workspace-access"

export default async function ProcurementPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canSubmit = hasAnyRole(context.auth.membership?.role, allStaffRoles)
  const canUseMemberProcurement = context.auth.membership?.role === "member"
  const canReview = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles,
  )

  if (!canSubmit && !canUseMemberProcurement) {
    return (
      <WorkspacePageShell
        eyebrow="Procurement"
        title="Procurement"
        description="Track cooperative-purchased member items and repayment plans."
      >
        <WorkspaceEmptyState
          body="Procurement is available to cooperative staff and linked members."
          title="Procurement access is restricted."
        />
      </WorkspacePageShell>
    )
  }

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Procurement"
        title="Procurement"
        description="Track cooperative-purchased member items and repayment plans."
      >
        <WorkspaceEmptyState
          body="Once the database-backed environment is active, this route will show procurement requests, review status, and repayment estimates."
          title="Procurement needs the database runtime."
        />
      </WorkspacePageShell>
    )
  }

  if (canUseMemberProcurement) {
    if (!context.auth.user) {
      return (
        <WorkspacePageShell
          eyebrow="Procurement"
          title="My procurement"
          description="Request a cooperative-purchased item and track finance review."
        >
          <WorkspaceEmptyState
            body="Sign in with your member account to request procurement."
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
          eyebrow="Procurement"
          title="My procurement"
          description="Request a cooperative-purchased item and track finance review."
        >
          <WorkspaceEmptyState
            body="Your user account is not linked to a member profile in this cooperative."
            title="Member profile not linked."
          />
        </WorkspacePageShell>
      )
    }

    const requests = await listProcurementRequests({
      memberId: member.id,
      tenantId: context.tenant.id,
    })

    return (
      <WorkspacePageShell
        eyebrow="Procurement"
        title="My procurement"
        description="Request a cooperative-purchased item and track finance review."
      >
        <MemberProcurementRequestsView member={member} requests={requests} />
      </WorkspacePageShell>
    )
  }

  const [requests, summary, members] = await Promise.all([
    listProcurementRequests({ tenantId: context.tenant.id }),
    getProcurementSummary(context.tenant.id),
    listMembers(context.tenant.id, { page: 1, pageSize: 200 }),
  ])

  return (
    <WorkspacePageShell
      eyebrow="Procurement"
      title="Procurement"
      description="Stage and review member item-purchase requests before the cooperative commits funds."
    >
      <ProcurementRequestsView
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
