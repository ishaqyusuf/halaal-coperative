import {
  DashboardSectionCard,
  DashboardSectionHeader,
} from "@/components/dashboard"
import { MembershipApprovalForm } from "@/components/onboarding/membership-approval-form"

export function MembershipApprovalContent({
  requestId,
}: {
  requestId: string
}) {
  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Approval form"
        title="Finalize member access"
        description="Set the member's balance, contribution commitment, and optional active loan before approving dashboard access."
      />
      <div className="mt-5">
        <MembershipApprovalForm requestId={requestId} />
      </div>
    </DashboardSectionCard>
  )
}
