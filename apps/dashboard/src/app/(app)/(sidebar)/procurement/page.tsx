import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import {
  MemberProcurementRequestsView,
  ProcurementRequestsView,
} from "@/components/procurement-requests-view"
import { loadProcurementPageData } from "@/lib/procurement/load-procurement-page"

export default async function ProcurementPage() {
  const data = await loadProcurementPageData()

  if (data.state === "restricted") {
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

  if (data.state === "unavailable") {
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

  if (data.state === "member-sign-in-required") {
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

  if (data.state === "member-profile-missing") {
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

  if (data.state === "member-ready") {
    return (
      <WorkspacePageShell
        eyebrow="Procurement"
        title="My procurement"
        description="Request a cooperative-purchased item and track finance review."
      >
        <MemberProcurementRequestsView
          chargeOptions={data.chargeOptions}
          member={data.member}
          requests={data.requests}
        />
      </WorkspacePageShell>
    )
  }

  return (
    <WorkspacePageShell
      eyebrow="Procurement"
      title="Procurement"
      description="Stage and review member item-purchase requests before the cooperative commits funds."
    >
      <ProcurementRequestsView
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
