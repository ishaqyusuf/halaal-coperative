"use client"

import { Suspense } from "react"
import { GuarantorApprovalContent } from "@/components/guarantor-approval-content"
import { GuarantorApprovalSheetHeader } from "@/components/guarantor-approval-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useGuarantorApprovalParams } from "@/hooks/use-guarantor-approval-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export function GuarantorApprovalSheet() {
  const { guarantorApprovalId, setParams } = useGuarantorApprovalParams()
  const isOpen = Boolean(guarantorApprovalId)

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("guarantorApproval", "response")}
      open={isOpen}
      onOpenChange={handleOnOpenChange}
    >
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading guarantor response...
              </div>
            }
          >
            <GuarantorApprovalSheetHeader />
            <GuarantorApprovalContent />
          </Suspense>
        ) : null}
    </WorkflowPresentation>
  )
}
