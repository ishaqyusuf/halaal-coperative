"use client"

import { Suspense } from "react"
import { RepaymentContent } from "@/components/repayment-content"
import { RepaymentSheetHeader } from "@/components/repayment-sheet-header"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { useRepaymentParams } from "@/hooks/use-repayment-params"

function isRepaymentSheetOpen(type: string | null) {
  return Boolean(type === "refresh" || type === "post" || type === "followUp")
}

export function RepaymentSheet({
  assignees,
  devMode,
  loans,
  scheduleItems,
}: {
  assignees: Array<{ id: string; label: string }>
  devMode: boolean
  loans: Array<any>
  scheduleItems: Array<any>
}) {
  const { repaymentSheetType, setParams } = useRepaymentParams()
  const isOpen = isRepaymentSheetOpen(repaymentSheetType)
  const isWide = repaymentSheetType === "post"

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOnOpenChange}>
      <SheetContent
        className={
          isWide ? "w-full overflow-y-auto sm:max-w-2xl" : "overflow-y-auto"
        }
      >
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading repayment form...
              </div>
            }
          >
            <RepaymentSheetHeader />
            <RepaymentContent
              assignees={assignees}
              devMode={devMode}
              loans={loans}
              scheduleItems={scheduleItems}
            />
          </Suspense>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
