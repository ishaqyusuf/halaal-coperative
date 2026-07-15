"use client"

import { Suspense } from "react"
import type { TenantSharePolicySettings } from "@halaalvest/db"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { MemberShareApplicationSheetHeader } from "@/components/member-share-application-sheet-header"
import { MemberShareApplicationCreateContent } from "@/components/share-application-content"
import { useShareApplicationParams } from "@/hooks/use-share-application-params"

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
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeSheet()}>
      <SheetContent className="overflow-y-auto">
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
      </SheetContent>
    </Sheet>
  )
}
