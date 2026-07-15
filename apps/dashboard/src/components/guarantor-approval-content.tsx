"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useGuarantorApprovalParams } from "@/hooks/use-guarantor-approval-params"
import { respondMemberLoanGuarantorApprovalAction } from "@/lib/dashboard-actions"

export function GuarantorApprovalContent() {
  const { guarantorApprovalId, guarantorResponseStatus } =
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
      action={respondMemberLoanGuarantorApprovalAction}
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
      <Button
        type="submit"
        variant={guarantorResponseStatus === "approved" ? "default" : "outline"}
      >
        {guarantorResponseStatus === "approved" ? "Approve" : "Reject"}
      </Button>
    </form>
  )
}
