"use client"

import type {
  MonthlyRecordSettingView,
  MonthlyRecordWorkplace,
} from "@halaalvest/db"
import { skipToken, useQuery } from "@tanstack/react-query"
import { MonthlyRecordContent } from "@/components/monthly-record-content"
import { MonthlyRecordSheetHeader } from "@/components/monthly-record-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

export function MonthlyRecordSheet({
  monthlyRecordId,
  periodLabel,
  settings,
  workplaces,
}: {
  monthlyRecordId?: string
  periodLabel?: string
  settings: MonthlyRecordSettingView
  workplaces: MonthlyRecordWorkplace[]
}) {
  const { monthlyRecordMemberId, monthlyRecordSheetType, setParams } = useMonthlyRecordParams()
  const trpc = useTRPC()
  const isMemberAction = monthlyRecordSheetType === "apply" || monthlyRecordSheetType === "cancel"
  const selected = useQuery(
    trpc.monthlyRecords.actionRows.queryOptions(
      isMemberAction && monthlyRecordId && monthlyRecordMemberId
        ? { monthlyRecordId, scope: { rowId: monthlyRecordMemberId } }
        : skipToken,
      { gcTime: 0, retry: false },
    )
  )
  const row = selected.data?.[0]
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
            row={row}
          />
          {selected.isLoading ? (
            <p role="status" className="text-muted-foreground">Loading member…</p>
          ) : selected.isError ? (
            <p role="alert" className="text-muted-foreground">
              Could not load this member. Close the sheet and try again.
            </p>
          ) : (
            <MonthlyRecordContent
              monthlyRecordId={monthlyRecordId}
              periodLabel={periodLabel}
              selectedRow={row}
              settings={settings}
              workplaces={workplaces}
            />
          )}
        </>
      ) : null}
    </WorkflowPresentation>
  )
}
