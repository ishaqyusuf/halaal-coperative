"use client"

import { Button } from "@halaalvest/ui/components/button"
import { WorkflowConfirmFooter } from "@/components/workflow-confirm-footer"
import { useGuarantorApprovalParams } from "@/hooks/use-guarantor-approval-params"
import { respondMemberLoanGuarantorApprovalAction } from "@/lib/dashboard-actions"

export function GuarantorApprovalContent() {
  const { guarantorApprovalId, guarantorResponseStatus, setParams } =
    useGuarantorApprovalParams()

  if (!guarantorApprovalId || !guarantorResponseStatus) {
    return (
      <div className="px-6 text-sm text-muted-foreground">
        Select a guarantor request response to continue.
      </div>
    )
  }

  return (
    <form
      action={async (formData) => {
        await respondMemberLoanGuarantorApprovalAction(formData)
        await setParams(null)
      }}
      className="grid gap-4 px-6"
    >
      <input
        name="guarantorApprovalId"
        type="hidden"
        value={guarantorApprovalId}
      />
      <input name="status" type="hidden" value={guarantorResponseStatus} />
      <p className="text-sm text-muted-foreground">
        Confirm that you want to mark this guarantor request as{" "}
        {guarantorResponseStatus}.
      </p>
      <WorkflowConfirmFooter>
        <Button
          type="submit"
          variant={
            guarantorResponseStatus === "approved" ? "default" : "destructive"
          }
        >
          {guarantorResponseStatus === "approved" ? "Approve" : "Reject"}
        </Button>
      </WorkflowConfirmFooter>
    </form>
  )
}
