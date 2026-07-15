"use client"

import { Suspense } from "react"
import { ChargeOperationContent } from "@/components/charge-operation-content"
import { ChargeOperationSheetHeader } from "@/components/charge-operation-sheet-header"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"

function isChargeOperationSheetOpen(type: string | null) {
  return Boolean(
    type === "definition" ||
      type === "application" ||
      type === "waive" ||
      type === "reverse" ||
      type === "toggle" ||
      type === "version"
  )
}

export function ChargeOperationSheet({
  activeCharges,
  devMode,
  members,
}: {
  activeCharges: Array<{ code: string; id: string; name: string }>
  devMode: boolean
  members: Array<{ fullName: string; id: string; memberNumber: string }>
}) {
  const { chargeOperationSheetType, setParams } = useChargeOperationParams()
  const isOpen = isChargeOperationSheetOpen(chargeOperationSheetType)
  const isWide =
    chargeOperationSheetType === "definition" ||
    chargeOperationSheetType === "application" ||
    chargeOperationSheetType === "version"

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
                Loading charge form...
              </div>
            }
          >
            <ChargeOperationSheetHeader />
            <ChargeOperationContent
              activeCharges={activeCharges}
              devMode={devMode}
              members={members}
            />
          </Suspense>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
