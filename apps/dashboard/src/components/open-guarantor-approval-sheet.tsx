"use client"

import { Button } from "@halaalvest/ui/components/button"
import { CheckIcon, XIcon } from "lucide-react"
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
      onClick={() =>
        setParams({
          guarantorApprovalId: approvalId,
          guarantorResponseStatus: status,
        })
      }
      size="sm"
      type="button"
      variant={status === "approved" ? "default" : "outline"}
    >
      {status === "approved" ? (
        <CheckIcon data-icon="inline-start" />
      ) : (
        <XIcon data-icon="inline-start" />
      )}
      {status === "approved" ? "Approve" : "Reject"}
    </Button>
  )
}
