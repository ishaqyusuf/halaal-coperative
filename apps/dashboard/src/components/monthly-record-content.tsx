"use client"

import { useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import { Switch } from "@halaalvest/ui/components/switch"
import type {
  MonthlyRecordMemberRow,
  MonthlyRecordSettingView,
} from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { WorkplaceReceiveContent } from "@/components/monthly-records/workplace-receive-content"
import { WorkplacesContent } from "@/components/monthly-records/workplaces-content"
import { WorkflowConfirmFooter } from "@/components/workflow-confirm-footer"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"
import {
  applyMonthlyRecordMemberAction,
  cancelMonthlyRecordMemberAction,
  createMonthlyRecordAction,
  generateMonthlyRecordsNowAction,
  updateMonthlyRecordSettingsAction,
} from "@/lib/dashboard-actions"

function periodName(year?: number | null, month?: number | null) {
  if (!year || !month) return "this month"
  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

export function MonthlyRecordContent({
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
  const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(
    settings.autoGenerateEnabled
  )
  const {
    monthlyRecordMemberId,
    monthlyRecordSheetType,
    setParams,
    targetMonth,
    targetYear,
  } = useMonthlyRecordParams()
  const selectedRow = rows.find((row) => row.id === monthlyRecordMemberId)

  if (monthlyRecordSheetType === "receive") {
    return (
      <WorkplaceReceiveContent
        monthlyRecordId={monthlyRecordId}
        periodLabel={periodLabel}
        rows={rows}
      />
    )
  }

  if (monthlyRecordSheetType === "workplaces") {
    return <WorkplacesContent />
  }

  if (monthlyRecordSheetType === "generate") {
    return (
      <form
        action={async () => {
          await generateMonthlyRecordsNowAction()
          await setParams(null)
        }}
      >
        <WorkflowConfirmFooter>
          <Button type="submit">Start due months</Button>
        </WorkflowConfirmFooter>
      </form>
    )
  }

  if (monthlyRecordSheetType === "create") {
    return (
      <form action={createMonthlyRecordAction}>
        <input name="year" type="hidden" value={targetYear ?? ""} />
        <input name="month" type="hidden" value={targetMonth ?? ""} />
        <WorkflowConfirmFooter>
          <Button disabled={!targetYear || !targetMonth} type="submit">
            Start {periodName(targetYear, targetMonth)}
          </Button>
        </WorkflowConfirmFooter>
      </form>
    )
  }

  if (monthlyRecordSheetType === "apply") {
    if (!selectedRow) {
      return (
        <p className="text-muted-foreground">This member was not found.</p>
      )
    }

    return (
      <form
        action={applyMonthlyRecordMemberAction}
        className="grid gap-5"
      >
        <input
          name="monthlyRecordMemberId"
          type="hidden"
          value={selectedRow.id}
        />
        <div>
          <p className="font-medium text-foreground">{selectedRow.memberName}</p>
          <p className="text-muted-foreground">
            Owes {formatCurrency(selectedRow.totalPayableAmount)}
          </p>
        </div>
        <label className="grid gap-2 font-medium">
          Amount paid
          <CurrencyPrefixInput
            defaultValue={selectedRow.totalPaidAmount.toFixed(2)}
            min="0"
            name="totalPaidAmount"
            step="0.01"
            type="number"
          />
        </label>
        <Button size="lg" type="submit">
          Mark paid
        </Button>
      </form>
    )
  }

  if (monthlyRecordSheetType === "cancel") {
    return (
      <form
        action={async (formData) => {
          await cancelMonthlyRecordMemberAction(formData)
          await setParams(null)
        }}
      >
        <input
          name="monthlyRecordMemberId"
          type="hidden"
          value={monthlyRecordMemberId ?? ""}
        />
        <WorkflowConfirmFooter cancelLabel="Keep">
          <Button
            disabled={!monthlyRecordMemberId}
            type="submit"
            variant="destructive"
          >
            {selectedRow?.status === "applied" ? "Undo payment" : "Cancel row"}
          </Button>
        </WorkflowConfirmFooter>
      </form>
    )
  }

  if (monthlyRecordSheetType === "settings") {
    return (
      <form
        action={async (formData) => {
          await updateMonthlyRecordSettingsAction(formData)
          await setParams(null)
        }}
        className="grid gap-5"
      >
        <label className="flex min-h-11 items-center justify-between gap-4 font-medium">
          Start each month automatically
          <input
            name="autoGenerateEnabled"
            type="hidden"
            value={autoGenerateEnabled ? "on" : ""}
          />
          <Switch
            checked={autoGenerateEnabled}
            onCheckedChange={setAutoGenerateEnabled}
          />
        </label>
        <label className="grid gap-2 font-medium">
          On day
          <Input
            defaultValue={settings.generationDayOfMonth}
            inputMode="numeric"
            max={28}
            min={1}
            name="generationDayOfMonth"
            type="number"
          />
        </label>
        <Button size="lg" type="submit">
          Save
        </Button>
      </form>
    )
  }

  return null
}
