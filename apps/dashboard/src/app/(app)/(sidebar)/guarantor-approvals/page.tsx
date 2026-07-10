import {
  createDbRuntime,
  getMemberByUserId,
  listMemberLoanGuarantorApprovals,
} from "@halaalvest/db"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { MemberGuarantorApprovalsView } from "@/components/member-guarantor-approvals-view"
import { getDashboardServerContext } from "@/lib/server-context"

export default async function GuarantorApprovalsPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canUseMemberGuarantors = context.auth.membership?.role === "member"

  if (!canUseMemberGuarantors) {
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

  if (!context.tenant || runtime.status !== "database-configured") {
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

  if (!context.auth.user) {
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

  const member = await getMemberByUserId({
    tenantId: context.tenant.id,
    userId: context.auth.user.id,
  })

  if (!member) {
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

  const approvals = await listMemberLoanGuarantorApprovals({
    guarantorMemberId: member.id,
    tenantId: context.tenant.id,
  })

  return (
    <WorkspacePageShell
      description="Review guarantor requests linked to your member profile."
      eyebrow="Guarantor"
      title="Guarantor approvals"
    >
      <MemberGuarantorApprovalsView approvals={approvals} />
    </WorkspacePageShell>
  )
}
