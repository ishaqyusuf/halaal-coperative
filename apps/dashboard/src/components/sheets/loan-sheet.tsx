"use client"

import { Suspense } from "react"
import {
  LoanContent,
  type LoanMemberOption,
  type LoanProductOption,
  type LoanRequestChargeOption,
} from "@/components/loan-content"
import { LoanSheetHeader } from "@/components/loan-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useLoanParams } from "@/hooks/use-loan-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

function isLoanSheetOpen(type: string | null) {
  return Boolean(
    type === "request" ||
    type === "request-details" ||
    type === "review" ||
    type === "guarantor" ||
    type === "disburse" ||
    type === "loan-details"
  )
}

export function LoanSheet({
  devMode,
  disabledReason,
  fixedMember,
  loanProducts,
  loanRequestCharges,
  members,
}: {
  devMode: boolean
  disabledReason?: string | null
  fixedMember?: LoanMemberOption
  loanProducts: LoanProductOption[]
  loanRequestCharges?: LoanRequestChargeOption[]
  members: LoanMemberOption[]
}) {
  const { loanSheetType, setParams } = useLoanParams()
  const isOpen = isLoanSheetOpen(loanSheetType)
  const presentation = getWorkflowPresentation("loan", loanSheetType)

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <WorkflowPresentation
      config={presentation}
      mobileFullScreen
      open={isOpen}
      onOpenChange={handleOnOpenChange}
    >
      {isOpen ? (
        <Suspense
          fallback={
            <div className="px-6 text-sm text-muted-foreground">
              Loading loan form...
            </div>
          }
        >
          <LoanSheetHeader />
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            <LoanContent
              devMode={devMode}
              disabledReason={disabledReason}
              fixedMember={fixedMember}
              loanProducts={loanProducts}
              loanRequestCharges={loanRequestCharges}
              members={members}
            />
          </div>
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
