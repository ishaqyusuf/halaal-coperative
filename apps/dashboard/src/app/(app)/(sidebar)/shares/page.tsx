import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { MemberSharesView } from "@/components/member-shares-view"
import { loadMemberSharesPageData } from "@/lib/shares/load-member-shares-page"

export default async function MemberSharesPage() {
  const data = await loadMemberSharesPageData()

  if (data.state === "restricted") {
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

  if (data.state === "unavailable") {
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

  if (data.state === "member-sign-in-required") {
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

  if (data.state === "member-profile-missing") {
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

  if (data.state === "unit-model-inactive") {
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

  return (
    <WorkspacePageShell
      description="Track compulsory units, optional share requests, and finance review status."
      eyebrow="Shares"
      title="My shares"
    >
      <MemberSharesView
        applications={data.applications}
        member={data.member}
        policy={data.policy}
        position={data.position}
      />
    </WorkspacePageShell>
  )
}
