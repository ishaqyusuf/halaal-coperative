"use client"

import { Suspense } from "react"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { ChargeContent } from "@/components/charge-content"
import { ChargeSheetFormProvider } from "@/components/charge/form-context"
import { ChargeSheetHeader } from "@/components/charge-sheet-header"
import { useChargeParams } from "@/hooks/use-charge-params"
import type { Charge } from "@/components/tables/charges/columns"

export function ChargeSheet({
  financeStartDate,
  isLocked,
  quickFillEnabled = false,
  rows,
}: {
  financeStartDate?: string | null
  isLocked: boolean
  quickFillEnabled?: boolean
  rows: Charge[]
}) {
  const { chargeType, setParams } = useChargeParams()
  const isCreate = chargeType === "create"
  const isUpdate = chargeType === "update"
  const isEdit = chargeType === "edit"
  const isOpen = isCreate || isUpdate || isEdit

  const handleOnOpenChange = (open: boolean) => {
    if (!open) {
      setParams(null)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOnOpenChange}>
      <SheetContent>
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading charge form...
              </div>
            }
          >
            <ChargeSheetFormProvider
              value={{
                financeStartDate,
                isLocked,
                quickFillEnabled,
                rows,
              }}
            >
              <ChargeSheetHeader />
              <ChargeContent />
            </ChargeSheetFormProvider>
          </Suspense>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
