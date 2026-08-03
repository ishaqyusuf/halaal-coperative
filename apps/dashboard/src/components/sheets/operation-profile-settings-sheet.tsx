"use client"

import { Suspense } from "react"
import type {
  TenantOperationProfilePolicy,
  TenantServiceCapability,
  TenantServiceKey,
} from "@halaalvest/db"
import { OperationProfileSettingsContent } from "@/components/operation-profile-settings-content"
import { OperationProfileSettingsSheetHeader } from "@/components/operation-profile-settings-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useOperationProfileSettingsParams } from "@/hooks/use-operation-profile-settings-params"
import { operationProfileServiceKeys } from "@/lib/settings/operation-profile-settings"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export function OperationProfileSettingsSheet({
  policy,
  services,
}: {
  policy: TenantOperationProfilePolicy
  services: Record<TenantServiceKey, TenantServiceCapability>
}) {
  const {
    operationProfileServiceKey,
    operationProfileSettingsSheetType,
    setParams,
  } = useOperationProfileSettingsParams()
  const isOpen = operationProfileSettingsSheetType === "edit"
  const selectedServiceKey =
    operationProfileServiceKey ?? operationProfileServiceKeys[0]

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
              Loading service access form...
            </div>
          }
        >
          <OperationProfileSettingsSheetHeader
            serviceKey={selectedServiceKey}
          />
          <OperationProfileSettingsContent
            currentAccessMode={services[selectedServiceKey].accessMode}
            key={selectedServiceKey}
            policy={policy}
            serviceKey={selectedServiceKey}
          />
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
