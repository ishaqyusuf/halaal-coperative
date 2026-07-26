"use client"

import { Suspense } from "react"
import { ChargeContent } from "@/components/charge-content"
import { ChargeSheetFormProvider } from "@/components/charge/form-context"
import { ChargeSheetHeader } from "@/components/charge-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useChargeParams } from "@/hooks/use-charge-params"
import type { Charge } from "@/components/tables/charges/columns"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export function ChargeSheet({
  financeStartDate,
  isLocked,
  quickFillEnabled = false,
  rows,
}: {
  financeStartDate?: string | null
  isLocked: boolean
  quickFillEnabled?: boolean
  rows: Charge[]
}) {
  const { chargeType, setParams } = useChargeParams()
  const isCreate = chargeType === "create"
  const isUpdate = chargeType === "update"
  const isEdit = chargeType === "edit"
  const isOpen = isCreate || isUpdate || isEdit
  const presentation = getWorkflowPresentation("charge", chargeType)

  const handleOnOpenChange = (open: boolean) => {
    if (!open) {
      setParams(null)
    }
  }

  return (
    <WorkflowPresentation
      config={presentation}
      open={isOpen}
      onOpenChange={handleOnOpenChange}
    >
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading charge form...
              </div>
            }
          >
            <ChargeSheetFormProvider
              value={{
                financeStartDate,
                isLocked,
                quickFillEnabled,
                rows,
              }}
            >
              <ChargeSheetHeader />
              <ChargeContent />
            </ChargeSheetFormProvider>
          </Suspense>
        ) : null}
    </WorkflowPresentation>
  )
}
