"use client"

import { Button } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import type { MonthlyRecordMemberRow, MonthlyRecordSettingView } from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"
import {
  applyMonthlyRecordMemberAction,
  cancelMonthlyRecordMemberAction,
  createMonthlyRecordAction,
  generateMonthlyRecordsNowAction,
  updateMonthlyRecordSettingsAction,
} from "@/lib/dashboard-actions"

export function MonthlyRecordContent({
  rows,
  settings,
}: {
  rows: MonthlyRecordMemberRow[]
  settings: MonthlyRecordSettingView
}) {
  const {
    monthlyRecordMemberId,
    monthlyRecordSheetType,
    targetMonth,
    targetYear,
  } = useMonthlyRecordParams()
  const selectedRow = rows.find((row) => row.id === monthlyRecordMemberId)

  if (monthlyRecordSheetType === "generate") {
    return (
      <form action={generateMonthlyRecordsNowAction} className="grid gap-4 px-6">
        <p className="text-sm text-muted-foreground">
          Generate all monthly records that are currently due based on the
          configured automation settings.
        </p>
        <Button type="submit" variant="outline">
          Generate due records now
        </Button>
      </form>
    )
  }

  if (monthlyRecordSheetType === "create") {
    return (
      <form action={createMonthlyRecordAction} className="grid gap-4 px-6">
        <input name="year" type="hidden" value={targetYear ?? ""} />
        <input name="month" type="hidden" value={targetMonth ?? ""} />
        <p className="text-sm text-muted-foreground">
          Create the monthly record for month {targetMonth ?? "-"} of{" "}
          {targetYear ?? "-"}.
        </p>
        <Button disabled={!targetYear || !targetMonth} type="submit">
          Create monthly record
        </Button>
      </form>
    )
  }

  if (monthlyRecordSheetType === "apply") {
    if (!selectedRow) {
      return (
        <div className="px-6 text-sm text-muted-foreground">
          Select a member row before applying a monthly record.
        </div>
      )
    }

    return (
      <form
        action={applyMonthlyRecordMemberAction}
        className="grid gap-4 px-6"
      >
        <input
          name="monthlyRecordMemberId"
          type="hidden"
          value={selectedRow.id}
        />
        <div className="rounded-lg border p-4">
          <p className="font-medium text-foreground">{selectedRow.memberName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Payable {formatCurrency(selectedRow.totalPayableAmount)}
          </p>
        </div>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Total paid
          <CurrencyPrefixInput
            defaultValue={selectedRow.totalPaidAmount.toFixed(2)}
            min="0"
            name="totalPaidAmount"
            step="0.01"
            type="number"
          />
        </label>
        <Button type="submit">Apply member row</Button>
      </form>
    )
  }

  if (monthlyRecordSheetType === "cancel") {
    return (
      <form
        action={cancelMonthlyRecordMemberAction}
        className="grid gap-4 px-6"
      >
        <input
          name="monthlyRecordMemberId"
          type="hidden"
          value={monthlyRecordMemberId ?? ""}
        />
        <p className="text-sm text-muted-foreground">
          Cancel this monthly record member row. It will remain visible with a
          cancelled status.
        </p>
        <Button disabled={!monthlyRecordMemberId} type="submit" variant="outline">
          Cancel member row
        </Button>
      </form>
    )
  }

  if (monthlyRecordSheetType === "settings") {
    return (
      <form
        action={updateMonthlyRecordSettingsAction}
        className="grid gap-4 px-6"
      >
        <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            className="size-4"
            defaultChecked={settings.autoGenerateEnabled}
            name="autoGenerateEnabled"
            type="checkbox"
          />
          Auto-generate
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Day of month
          <Input
            defaultValue={settings.generationDayOfMonth}
            max={28}
            min={1}
            name="generationDayOfMonth"
            type="number"
          />
        </label>
        <Button type="submit">Save settings</Button>
      </form>
    )
  }

  return (
    <div className="px-6 text-sm text-muted-foreground">
      Select a monthly record action to continue.
    </div>
  )
}
