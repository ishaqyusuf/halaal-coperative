"use client"

import { Suspense } from "react"
import { ChargeOperationContent } from "@/components/charge-operation-content"
import { ChargeOperationSheetHeader } from "@/components/charge-operation-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

function isChargeOperationSheetOpen(type: string | null) {
  return Boolean(
    type === "definition" ||
      type === "application" ||
      type === "waive" ||
      type === "reverse" ||
      type === "toggle" ||
      type === "version"
  )
}

export function ChargeOperationSheet({
  activeCharges,
  devMode,
  members,
}: {
  activeCharges: Array<{ code: string; id: string; name: string }>
  devMode: boolean
  members: Array<{ fullName: string; id: string; memberNumber: string }>
}) {
  const { chargeOperationSheetType, setParams } = useChargeOperationParams()
  const isOpen = isChargeOperationSheetOpen(chargeOperationSheetType)
  const presentation = getWorkflowPresentation(
    "chargeOperation",
    chargeOperationSheetType
  )

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
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
            <ChargeOperationSheetHeader />
            <ChargeOperationContent
              activeCharges={activeCharges}
              devMode={devMode}
              members={members}
            />
          </Suspense>
        ) : null}
    </WorkflowPresentation>
  )
}
