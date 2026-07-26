"use client"

import { Suspense } from "react"
import type { TenantSharePolicySettings } from "@halaalvest/db"
import { ShareContent } from "@/components/share-content"
import { ShareSheetFormProvider } from "@/components/share/form-context"
import { ShareSheetHeader } from "@/components/share-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useShareParams } from "@/hooks/use-share-params"
import type { Share } from "@/components/tables/shares/columns"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export function ShareSheet({
  financeStartDate,
  isLocked,
  rows,
  sharePolicy,
}: {
  financeStartDate?: string | null
  isLocked: boolean
  rows: Share[]
  sharePolicy: TenantSharePolicySettings
}) {
  const { setParams, shareType } = useShareParams()
  const isCreate = shareType === "create"
  const isEdit = shareType === "edit"
  const isPolicy = shareType === "policy"
  const isOpen = isCreate || isEdit || isPolicy
  const presentation = getWorkflowPresentation("share", shareType)

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
                Loading share form...
              </div>
            }
          >
            <ShareSheetFormProvider
              value={{
                financeStartDate,
                isLocked,
                rows,
                sharePolicy,
              }}
            >
              <ShareSheetHeader />
              <ShareContent />
            </ShareSheetFormProvider>
          </Suspense>
        ) : null}
    </WorkflowPresentation>
  )
}
