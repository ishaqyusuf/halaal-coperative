"use client"

import {
  NativeSelect,
  NativeSelectOption,
} from "@halaalvest/ui/components/native-select"
import type { MonthlyRecordSummary } from "@halaalvest/db"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useId, useMemo } from "react"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"

const monthsShown = 24

function periodLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

// The last two years of months, newest first, plus any older month that has a
// record. A month without a record opens the "Start month" confirm.
export function MonthPicker({
  records,
  selectedRecordId,
}: {
  records: MonthlyRecordSummary[]
  selectedRecordId?: string
}) {
  const id = useId()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { setParams } = useMonthlyRecordParams()
  const options = useMemo(() => {
    const byPeriod = new Map(
      records.map((record) => [
        `${record.periodYear}-${record.periodMonth}`,
        record,
      ])
    )
    const today = new Date()
    const list: Array<{
      key: string
      label: string
      month: number
      record?: MonthlyRecordSummary
      year: number
    }> = []

    for (let offset = 0; offset < monthsShown; offset += 1) {
      const date = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - offset, 1)
      )
      const year = date.getUTCFullYear()
      const month = date.getUTCMonth() + 1
      const key = `${year}-${month}`
      list.push({
        key,
        label: periodLabel(year, month),
        month,
        record: byPeriod.get(key),
        year,
      })
      byPeriod.delete(key)
    }

    for (const record of byPeriod.values()) {
      list.push({
        key: `${record.periodYear}-${record.periodMonth}`,
        label: record.periodLabel,
        month: record.periodMonth,
        record,
        year: record.periodYear,
      })
    }

    return list.sort((left, right) =>
      right.year !== left.year ? right.year - left.year : right.month - left.month
    )
  }, [records])
  const selected = options.find((option) => option.record?.id === selectedRecordId)

  function handleChange(key: string) {
    const option = options.find((item) => item.key === key)
    if (!option) return

    if (option.record) {
      const next = new URLSearchParams(searchParams.toString())
      next.set("recordId", option.record.id)
      next.delete("year")
      router.push(`${pathname}?${next.toString()}`)
      return
    }

    void setParams({
      monthlyRecordMemberId: null,
      monthlyRecordSheetType: "create",
      targetMonth: option.month,
      targetYear: option.year,
    })
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label className="font-medium" htmlFor={id}>
        Month
      </label>
      <NativeSelect
        className="w-full"
        id={id}
        onChange={(event) => handleChange(event.target.value)}
        value={selected?.key ?? ""}
      >
        {selected ? null : (
          <NativeSelectOption disabled value="">
            Choose a month
          </NativeSelectOption>
        )}
        {options.map((option) => (
          <NativeSelectOption key={option.key} value={option.key}>
            {option.label}
            {option.record
              ? ` · ${option.record.recordedCount} of ${option.record.totalMembers} paid`
              : " · not started"}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
