import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { MemberGuarantorApprovalsView } from "@/components/member-guarantor-approvals-view"
import { loadGuarantorApprovalsPageData } from "@/lib/guarantor-approvals/load-guarantor-approvals-page"

export default async function GuarantorApprovalsPage() {
  const data = await loadGuarantorApprovalsPageData()

  if (data.state === "restricted") {
    return (
      <WorkspacePageShell
        description="Review guarantor requests linked to your member profile."
        eyebrow="Guarantor"
        title="Guarantor approvals"
      >
        <WorkspaceEmptyState
          body="Guarantor approvals are available to linked member accounts."
          title="Guarantor approvals are restricted."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "unavailable") {
    return (
      <WorkspacePageShell
        description="Review guarantor requests linked to your member profile."
        eyebrow="Guarantor"
        title="Guarantor approvals"
      >
        <WorkspaceEmptyState
          body="Once the database-backed environment is active, guarantor requests will appear here."
          title="Guarantor approvals need the database runtime."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "member-sign-in-required") {
    return (
      <WorkspacePageShell
        description="Review guarantor requests linked to your member profile."
        eyebrow="Guarantor"
        title="Guarantor approvals"
      >
        <WorkspaceEmptyState
          body="Sign in with your member account to review guarantor requests."
          title="Member sign-in required."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state === "member-profile-missing") {
    return (
      <WorkspacePageShell
        description="Review guarantor requests linked to your member profile."
        eyebrow="Guarantor"
        title="Guarantor approvals"
      >
        <WorkspaceEmptyState
          body="Your user account is not linked to a member profile in this cooperative."
          title="Member profile not linked."
        />
      </WorkspacePageShell>
    )
  }

  return (
    <WorkspacePageShell
      description="Review guarantor requests linked to your member profile."
      eyebrow="Guarantor"
      title="Guarantor approvals"
    >
      <MemberGuarantorApprovalsView approvals={data.approvals} />
    </WorkspacePageShell>
  )
}
