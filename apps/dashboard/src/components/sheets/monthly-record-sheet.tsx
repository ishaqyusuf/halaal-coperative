"use client"

import type {
  MonthlyRecordMemberRow,
  MonthlyRecordSettingView,
} from "@halaalvest/db"
import { MonthlyRecordContent } from "@/components/monthly-record-content"
import { MonthlyRecordSheetHeader } from "@/components/monthly-record-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export function MonthlyRecordSheet({
  monthlyRecordId,
  periodLabel,
  rows,
  settings,
}: {
  monthlyRecordId?: string
  periodLabel?: string
  rows: MonthlyRecordMemberRow[]
  settings: MonthlyRecordSettingView
}) {
  const { monthlyRecordSheetType, setParams } = useMonthlyRecordParams()
  const isOpen = Boolean(monthlyRecordSheetType)
  const presentation = getWorkflowPresentation(
    "monthlyRecord",
    monthlyRecordSheetType
  )

  return (
    <WorkflowPresentation
      config={presentation}
      contentClassName={
        monthlyRecordSheetType === "receive"
          ? "flex min-h-full flex-col gap-5"
          : "flex flex-col gap-5"
      }
      mobileFullScreen={monthlyRecordSheetType === "receive"}
      onOpenChange={(open) => {
        if (!open) void setParams(null)
      }}
      open={isOpen}
    >
      {isOpen ? (
        <>
          <MonthlyRecordSheetHeader
            periodLabel={periodLabel}
            presentation={presentation.presentation}
            rows={rows}
          />
          <MonthlyRecordContent
            monthlyRecordId={monthlyRecordId}
            periodLabel={periodLabel}
            rows={rows}
            settings={settings}
          />
        </>
      ) : null}
    </WorkflowPresentation>
  )
}
