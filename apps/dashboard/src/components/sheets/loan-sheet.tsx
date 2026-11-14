"use client"

import { LoanContent, type LoanContentProps } from "@/components/loan-content"
import { LoanSheetHeader } from "@/components/loan-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useLoanParams } from "@/hooks/use-loan-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

/**
 * Hosts every loan overlay from `?loanSheetType=`: the request form and the
 * request/loan details are right sheets; approve, decline, a guarantor's
 * answer and pay out are AlertDialogs (ADR-20261105 rule 4).
 */
export function LoanSheet(props: LoanContentProps) {
  const { loanSheetType, setParams } = useLoanParams()
  const isOpen = Boolean(loanSheetType)
  const presentation = getWorkflowPresentation("loan", loanSheetType)
  const isSheet = presentation.presentation === "sheet"

  return (
    <WorkflowPresentation
      config={presentation}
      mobileFullScreen
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) void setParams(null)
      }}
    >
      {isOpen ? (
        isSheet ? (
          <>
            <LoanSheetHeader />
            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              <LoanContent {...props} />
            </div>
          </>
        ) : (
          <LoanContent {...props} />
        )
      ) : null}
    </WorkflowPresentation>
  )
}
