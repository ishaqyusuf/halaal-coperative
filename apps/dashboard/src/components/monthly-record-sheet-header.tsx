"use client"

import {
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@halaalvest/ui/components/alert-dialog"
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import type { MonthlyRecordActionRow } from "@halaalvest/db"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"
import type { WorkflowPresentation } from "@/lib/workflow-presentations"

function periodName(year?: number | null, month?: number | null) {
  if (!year || !month) return "this month"
  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

export function MonthlyRecordSheetHeader({
  periodLabel,
  presentation,
  row,
}: {
  periodLabel?: string
  presentation: WorkflowPresentation
  row?: MonthlyRecordActionRow
}) {
  const {
    monthlyRecordSheetType: type,
    targetMonth,
    targetYear,
  } = useMonthlyRecordParams()
  const { description, title } =
    type === "receive"
      ? { description: periodLabel, title: "Receive from workplace" }
      : type === "workplaces"
        ? { description: undefined, title: "Workplaces" }
        : type === "settings"
          ? { description: undefined, title: "Monthly settings" }
          : type === "generate"
            ? {
                description: "Starts every month that is due by your settings.",
                title: "Start due months now?",
              }
            : type === "create"
              ? {
                  description: "Adds every active member and what they owe.",
                  title: `Start ${periodName(targetYear, targetMonth)}?`,
                }
              : type === "apply"
                ? { description: periodLabel, title: "Mark paid" }
                : type === "cancel" && row?.status === "applied"
                  ? {
                      description: `${row.memberName}. Their savings and loan payment for ${periodLabel ?? "this month"} are reversed.`,
                      title: "Undo this payment?",
                    }
                  : {
                      description: row
                        ? `${row.memberName} stays on the list as cancelled.`
                        : undefined,
                      title: row ? "Cancel this row?" : "Monthly record",
                    }

  if (presentation === "alert-dialog") {
    return (
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description ? (
          <AlertDialogDescription>{description}</AlertDialogDescription>
        ) : null}
      </AlertDialogHeader>
    )
  }

  if (presentation === "dialog") {
    return (
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
    )
  }

  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      {description ? <SheetDescription>{description}</SheetDescription> : null}
    </SheetHeader>
  )
}
