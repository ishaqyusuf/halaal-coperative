"use client"

import { Suspense } from "react"
import type {
  MonthlyRecordMemberRow,
  MonthlyRecordSettingView,
} from "@halaalvest/db"
import { MonthlyRecordContent } from "@/components/monthly-record-content"
import { MonthlyRecordSheetHeader } from "@/components/monthly-record-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

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
  const presentation = getWorkflowPresentation(
    "monthlyRecord",
    monthlyRecordSheetType
  )

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
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
                Loading monthly record action...
              </div>
            }
          >
            <MonthlyRecordSheetHeader />
            <MonthlyRecordContent rows={rows} settings={settings} />
          </Suspense>
        ) : null}
    </WorkflowPresentation>
  )
}
