"use client"

import { MembershipApprovalContent } from "@/components/membership-approval-content"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMembershipApprovalParams } from "@/hooks/use-membership-approval-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

// Review and approve a joiner in a right sheet over the list (ADR-20261105
// decisions 3 and 13). It loads its own data, so it lives in GlobalSheets.
export function MembershipApprovalSheet() {
  const { membershipRequestId, setParams } = useMembershipApprovalParams()

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("membershipApproval", "review")}
      mobileFullScreen
      onOpenChange={(open) => {
        if (!open) void setParams({ membershipRequestId: null })
      }}
      open={Boolean(membershipRequestId)}
    >
      {membershipRequestId ? (
        <MembershipApprovalContent requestId={membershipRequestId} />
      ) : null}
    </WorkflowPresentation>
  )
}
