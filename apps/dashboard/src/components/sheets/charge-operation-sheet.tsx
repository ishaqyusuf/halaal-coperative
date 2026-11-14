"use client"

import { Suspense } from "react"
import { ChargeOperationContent } from "@/components/charge-operation-content"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

/**
 * Every /charges overlay, URL-addressed by `chargeOperationSheetType`:
 * details/new charge/charge a member are sheets, change amount and record
 * payment are dialogs, turn on/off, waive and undo are alert dialogs.
 */
export function ChargeOperationSheet({
  canManageCharges,
  devMode,
}: {
  canManageCharges: boolean
  devMode: boolean
}) {
  const { chargeOperationSheetType, setParams } = useChargeOperationParams()
  const isOpen = Boolean(chargeOperationSheetType)
  const presentation = getWorkflowPresentation(
    "chargeOperation",
    chargeOperationSheetType
  )

  return (
    <WorkflowPresentation
      config={presentation}
      mobileFullScreen={presentation.presentation === "sheet"}
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) void setParams(null)
      }}
    >
      {isOpen ? (
        <Suspense
          fallback={
            <p className="px-4 py-6 text-base text-muted-foreground md:px-6">
              Loading…
            </p>
          }
        >
          <ChargeOperationContent
            canManageCharges={canManageCharges}
            devMode={devMode}
          />
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
