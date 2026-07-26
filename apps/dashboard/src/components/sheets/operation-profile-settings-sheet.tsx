"use client"

import { Suspense } from "react"
import type { TenantServiceKey } from "@halaalvest/db"
import { OperationProfileSettingsContent } from "@/components/operation-profile-settings-content"
import { OperationProfileSettingsSheetHeader } from "@/components/operation-profile-settings-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useOperationProfileSettingsParams } from "@/hooks/use-operation-profile-settings-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export function OperationProfileSettingsSheet({
  policy,
  services,
}: {
  policy: {
    foodPurchaseMaximumActiveObligationsPerMember: number
    foodPurchaseRequiresOpenCycle: boolean
    procurementMaximumActiveObligationsPerMember: number
  }
  services: Record<TenantServiceKey, { accessMode: string }>
}) {
  const { operationProfileSettingsSheetType, setParams } =
    useOperationProfileSettingsParams()
  const isOpen = operationProfileSettingsSheetType === "edit"

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("operationProfile", "edit")}
      open={isOpen}
      onOpenChange={handleOnOpenChange}
    >
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading operation profile form...
              </div>
            }
          >
            <OperationProfileSettingsSheetHeader />
            <OperationProfileSettingsContent
              policy={policy}
              services={services}
            />
          </Suspense>
        ) : null}
    </WorkflowPresentation>
  )
}
