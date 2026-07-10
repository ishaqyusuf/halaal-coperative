import {
  createDbRuntime,
  getMemberByUserId,
  getMemberUnitSharePosition,
  getTenantSharePolicy,
  listMemberShareApplications,
} from "@halaalvest/db"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { MemberSharesView } from "@/components/member-shares-view"
import { getDashboardServerContext } from "@/lib/server-context"

export default async function MemberSharesPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const tenantId = context.tenant?.id
  const canUseMemberShares = context.auth.membership?.role === "member"

  if (!canUseMemberShares) {
    return (
      <WorkspacePageShell
        description="Members can track their own unit-based share requests."
        eyebrow="Shares"
        title="My shares"
      >
        <WorkspaceEmptyState
          body="Member share self-service is available to linked member accounts."
          title="Share self-service is restricted."
        />
      </WorkspacePageShell>
    )
  }

  if (!tenantId || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        description="Track share units, optional requests, and finance review status."
        eyebrow="Shares"
        title="My shares"
      >
        <WorkspaceEmptyState
          body="Once the database-backed environment is active, share position and request status will appear here."
          title="Share self-service needs the database runtime."
        />
      </WorkspacePageShell>
    )
  }

  if (!context.auth.user) {
    return (
      <WorkspacePageShell
        description="Track share units, optional requests, and finance review status."
        eyebrow="Shares"
        title="My shares"
      >
        <WorkspaceEmptyState
          body="Sign in with your member account to submit and track share requests."
          title="Member sign-in required."
        />
      </WorkspacePageShell>
    )
  }

  const member = await getMemberByUserId({
    tenantId,
    userId: context.auth.user.id,
  })

  if (!member) {
    return (
      <WorkspacePageShell
        description="Track share units, optional requests, and finance review status."
        eyebrow="Shares"
        title="My shares"
      >
        <WorkspaceEmptyState
          body="Your user account is not linked to a member profile in this cooperative."
          title="Member profile not linked."
        />
      </WorkspacePageShell>
    )
  }

  const policy = await getTenantSharePolicy(tenantId)

  if (policy.configurationMode !== "unit_based") {
    return (
      <WorkspacePageShell
        description="This cooperative has selected the monthly share history model."
        eyebrow="Shares"
        title="My shares"
      >
        <WorkspaceEmptyState
          body="Optional unit share requests are available only when the cooperative selects unit-based shareholding."
          title="Unit share requests are not active."
        />
      </WorkspacePageShell>
    )
  }

  const [applications, position] = await Promise.all([
    listMemberShareApplications({
      memberId: member.id,
      tenantId,
    }),
    getMemberUnitSharePosition({
      memberId: member.id,
      tenantId,
    }),
  ])

  return (
    <WorkspacePageShell
      description="Track compulsory units, optional share requests, and finance review status."
      eyebrow="Shares"
      title="My shares"
    >
      <MemberSharesView
        applications={applications}
        member={member}
        policy={policy}
        position={position}
      />
    </WorkspacePageShell>
  )
}
