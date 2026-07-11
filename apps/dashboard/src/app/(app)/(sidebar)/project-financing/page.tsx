import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import {
  MemberProjectFinancingRequestsView,
  ProjectFinancingRequestsView,
} from "@/components/project-financing-requests-view"
import { loadProjectFinancingPageData } from "@/lib/project-financing/load-project-financing-page"

export default async function ProjectFinancingPage() {
  const data = await loadProjectFinancingPageData()

  if (data.state === "restricted") {
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

  if (data.state === "unavailable") {
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

  if (data.state === "member-sign-in-required") {
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

  if (data.state === "member-profile-missing") {
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

  if (data.state === "member-ready") {
    return (
      <WorkspacePageShell
        eyebrow="Project financing"
        title="My project financing"
        description="Request cooperative business funding and track finance review."
      >
        <MemberProjectFinancingRequestsView
          chargeOptions={data.chargeOptions}
          member={data.member}
          requests={data.requests}
        />
      </WorkspacePageShell>
    )
  }

  return (
    <WorkspacePageShell
      eyebrow="Project financing"
      title="Project financing"
      description="Stage and review member business funding requests without posting disbursements or profit allocations."
    >
      <ProjectFinancingRequestsView
        approvalChargeOptions={data.approvalChargeOptions}
        canReview={data.canReview}
        memberOptions={data.memberOptions}
        requests={data.requests}
        submissionChargeOptions={data.submissionChargeOptions}
        summary={data.summary}
      />
    </WorkspacePageShell>
  )
}
