"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useGuarantorApprovalParams } from "@/hooks/use-guarantor-approval-params"

export function OpenGuarantorApprovalSheet({
  approvalId,
  status,
}: {
  approvalId: string
  status: "approved" | "rejected"
}) {
  const { setParams } = useGuarantorApprovalParams()

  return (
    <Button
      className="h-12 flex-1 text-base sm:flex-none"
      onClick={() =>
        void setParams({
          guarantorApprovalId: approvalId,
          guarantorResponseStatus: status,
        })
      }
      type="button"
      variant={status === "approved" ? "default" : "outline"}
    >
      {status === "approved" ? "I agree" : "I can't"}
    </Button>
  )
}
