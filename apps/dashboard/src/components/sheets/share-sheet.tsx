"use client"

import { Suspense } from "react"
import type { TenantSharePolicySettings } from "@halaalvest/db"
import { ShareContent } from "@/components/share-content"
import { ShareSheetFormProvider } from "@/components/share/form-context"
import { ShareSheetHeader } from "@/components/share-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useShareParams } from "@/hooks/use-share-params"
import type { Share } from "@/components/share/share-types"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export function ShareSheet({
  canChangeModel = false,
  financeStartDate,
  isLocked,
  rows,
  sharePolicy,
}: {
  /** The share model itself can change only while past setup is open. */
  canChangeModel?: boolean
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
      mobileFullScreen
      open={isOpen}
      onOpenChange={handleOnOpenChange}
    >
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-base text-muted-foreground">
                Loading…
              </div>
            }
          >
            <ShareSheetFormProvider
              value={{
                canChangeModel,
                financeStartDate,
                isLocked,
                rows,
                sharePolicy,
              }}
            >
              <div className="grid gap-5 px-6 pb-8">
                <ShareSheetHeader />
                <ShareContent />
              </div>
            </ShareSheetFormProvider>
          </Suspense>
        ) : null}
    </WorkflowPresentation>
  )
}
