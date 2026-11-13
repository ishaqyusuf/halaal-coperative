"use client"

import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import type { MonthlyRecordMemberRow } from "@halaalvest/db"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"

// Row actions shared by the desktop table and the phone list: one clear action
// for the state the row is in.
export function MonthlyRecordRowActions({
  fullWidth = false,
  row,
}: {
  fullWidth?: boolean
  row: Pick<MonthlyRecordMemberRow, "id" | "status">
}) {
  const { setParams } = useMonthlyRecordParams()
  const open = (monthlyRecordSheetType: "apply" | "cancel") =>
    setParams({
      monthlyRecordMemberId: row.id,
      monthlyRecordSheetType,
      targetMonth: null,
      targetYear: null,
    })

  return (
    <div className={cn("flex gap-2", fullWidth ? "w-full" : "justify-end")}>
      {row.status !== "applied" ? (
        <Button
          className={fullWidth ? "flex-1" : undefined}
          onClick={() => void open("apply")}
          type="button"
        >
          Mark paid
        </Button>
      ) : null}
      {row.status !== "cancelled" ? (
        <Button
          className={fullWidth ? "flex-1" : undefined}
          onClick={() => void open("cancel")}
          type="button"
          variant="outline"
        >
          {row.status === "applied" ? "Undo" : "Cancel"}
        </Button>
      ) : null}
    </div>
  )
}
