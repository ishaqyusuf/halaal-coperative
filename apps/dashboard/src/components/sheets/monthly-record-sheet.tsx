"use client"

import { Suspense } from "react"
import type {
  MonthlyRecordMemberRow,
  MonthlyRecordSettingView,
} from "@halaalvest/db"
import { MonthlyRecordContent } from "@/components/monthly-record-content"
import { MonthlyRecordSheetHeader } from "@/components/monthly-record-sheet-header"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"

function isMonthlyRecordSheetOpen(type: string | null) {
  return Boolean(
    type === "generate" ||
      type === "create" ||
      type === "apply" ||
      type === "cancel" ||
      type === "settings"
  )
}

export function MonthlyRecordSheet({
  rows,
  settings,
}: {
  rows: MonthlyRecordMemberRow[]
  settings: MonthlyRecordSettingView
}) {
  const { monthlyRecordSheetType, setParams } = useMonthlyRecordParams()
  const isOpen = isMonthlyRecordSheetOpen(monthlyRecordSheetType)

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOnOpenChange}>
      <SheetContent className="overflow-y-auto">
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading monthly record action...
              </div>
            }
          >
            <MonthlyRecordSheetHeader />
            <MonthlyRecordContent rows={rows} settings={settings} />
          </Suspense>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
