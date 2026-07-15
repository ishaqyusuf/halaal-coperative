"use client"

import { Suspense } from "react"
import { GuarantorApprovalContent } from "@/components/guarantor-approval-content"
import { GuarantorApprovalSheetHeader } from "@/components/guarantor-approval-sheet-header"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { useGuarantorApprovalParams } from "@/hooks/use-guarantor-approval-params"

export function GuarantorApprovalSheet() {
  const { guarantorApprovalId, setParams } = useGuarantorApprovalParams()
  const isOpen = Boolean(guarantorApprovalId)

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOnOpenChange}>
      <SheetContent>
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading guarantor response...
              </div>
            }
          >
            <GuarantorApprovalSheetHeader />
            <GuarantorApprovalContent />
          </Suspense>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
