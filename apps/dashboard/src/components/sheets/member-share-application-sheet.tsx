"use client"

import { Suspense } from "react"
import type { TenantSharePolicySettings } from "@halaalvest/db"
import { MemberShareApplicationSheetHeader } from "@/components/member-share-application-sheet-header"
import { MemberShareApplicationCreateContent } from "@/components/share-application-content"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useShareApplicationParams } from "@/hooks/use-share-application-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export function MemberShareApplicationSheet({
  policy,
  remainingOptionalUnits,
}: {
  policy: TenantSharePolicySettings
  remainingOptionalUnits: number
}) {
  const { setParams, shareApplicationId, shareApplicationSheetType } =
    useShareApplicationParams()
  const isOpen =
    shareApplicationSheetType === "member-create" && !shareApplicationId

  const closeSheet = () => {
    void setParams({
      shareApplicationId: null,
      shareApplicationSheetType: null,
    })
  }

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("memberShareApplication", "create")}
      open={isOpen}
      onOpenChange={(open) => !open && closeSheet()}
    >
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading share request...
              </div>
            }
          >
            <MemberShareApplicationSheetHeader />
            <div className="px-6">
              <MemberShareApplicationCreateContent
                onClose={closeSheet}
                policy={policy}
                remainingOptionalUnits={remainingOptionalUnits}
              />
            </div>
          </Suspense>
        ) : null}
    </WorkflowPresentation>
  )
}
