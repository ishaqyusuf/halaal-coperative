"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Suspense } from "react"
import { BusinessContent } from "@/components/business-content"
import { BusinessFormProvider } from "@/components/business/form-context"
import { BusinessSheetHeader } from "@/components/business-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useBusinessParams } from "@/hooks/use-business-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

function isBusinessSheetOpen(type: string | null) {
  return Boolean(
    type === "create" ||
      type === "details" ||
      type === "profit" ||
      type === "edit" ||
      type === "editProfit" ||
      type === "reviewNone"
  )
}

export function BusinessSheet() {
  const queryClient = useQueryClient()
  const trpc = useTRPC()
  const { businessType, setParams } = useBusinessParams()
  const isOpen = isBusinessSheetOpen(businessType)
  const presentation = getWorkflowPresentation("business", businessType)

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
    queryClient.invalidateQueries({
      queryKey: trpc.business.list.infiniteQueryKey(),
    })
    queryClient.invalidateQueries({
      queryKey: trpc.business.summary.queryKey(),
    })
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
                Loading business form...
              </div>
            }
          >
            <BusinessFormProvider>
              <BusinessSheetHeader />
              <BusinessContent />
            </BusinessFormProvider>
          </Suspense>
        ) : null}
    </WorkflowPresentation>
  )
}
