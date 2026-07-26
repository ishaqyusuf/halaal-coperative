"use client"

import { Suspense } from "react"
import type { TenantTrustProfileForm } from "@/components/forms/settings-forms"
import { TrustSettingsContent } from "@/components/trust-settings-content"
import { TrustSettingsSheetHeader } from "@/components/trust-settings-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useTrustSettingsParams } from "@/hooks/use-trust-settings-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

type TenantTrustProfileFormProps = Parameters<typeof TenantTrustProfileForm>[0]

export function TrustSettingsSheet({
  defaultValues,
}: TenantTrustProfileFormProps) {
  const { setParams, trustSettingsSheetType } = useTrustSettingsParams()
  const isOpen = trustSettingsSheetType === "edit"

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("trust", "edit")}
      open={isOpen}
      onOpenChange={handleOnOpenChange}
    >
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading trust profile form...
              </div>
            }
          >
            <TrustSettingsSheetHeader />
            <TrustSettingsContent defaultValues={defaultValues} />
          </Suspense>
        ) : null}
    </WorkflowPresentation>
  )
}
