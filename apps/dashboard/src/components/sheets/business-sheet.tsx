"use client"

import { Suspense } from "react"
import { BusinessContent } from "@/components/business-content"
import { BusinessFormProvider } from "@/components/business/form-context"
import { BusinessSheetHeader } from "@/components/business-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useBusinessParams } from "@/hooks/use-business-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

/**
 * Every business overlay, URL-addressed by `businessType`: the business,
 * add/edit business and record/change profit are sheets (full screen on
 * phones); "no businesses to bring in" is a short dialog.
 */
export function BusinessSheet() {
  const { businessType, setParams } = useBusinessParams()
  const isOpen = Boolean(businessType)
  const presentation = getWorkflowPresentation("business", businessType)

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
          <BusinessFormProvider>
            <div className="grid gap-6 px-4 pb-8 md:px-6">
              <BusinessSheetHeader />
              <BusinessContent />
            </div>
          </BusinessFormProvider>
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
