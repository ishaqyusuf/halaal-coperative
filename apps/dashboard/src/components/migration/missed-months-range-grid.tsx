"use client"

import { useMemo, useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"

type MissedMonthsRangeGridRow = {
  month: string
  period: string
  savingsContribution: number
  status?: string
}

type MissedMonthsRangeGridProps = {
  disabled: boolean
  rows: MissedMonthsRangeGridRow[]
  selectedMonth?: string
}

function formatMonthOnly(period: string) {
  const [month] = period.split(/\s+/)

  return month ? month.slice(0, 3).toUpperCase() : period
}

function groupRowsByYear(rows: MissedMonthsRangeGridRow[]) {
  return rows.reduce<Array<{ rows: MissedMonthsRangeGridRow[]; year: string }>>(
    (groups, row) => {
      const year = row.month.slice(0, 4)
      const currentGroup = groups.at(-1)

      if (currentGroup?.year === year) {
        currentGroup.rows.push(row)
        return groups
      }

      groups.push({ rows: [row], year })
      return groups
    },
    []
  )
}

export function MissedMonthsRangeGrid({
  disabled,
  rows,
  selectedMonth,
}: MissedMonthsRangeGridProps) {
  const [fromMonth, setFromMonth] = useState(rows[0]?.month ?? "")
  const [toMonth, setToMonth] = useState(rows.at(-1)?.month ?? "")
  const [rangeAction, setRangeAction] = useState<"committed" | "missed">(
    "missed"
  )
  const [missedMonths, setMissedMonths] = useState(
    () =>
      new Set(
        rows.filter((row) => row.status === "missed").map((row) => row.month)
      )
  )
  const yearGroups = useMemo(() => groupRowsByYear(rows), [rows])
  const minMonth = rows[0]?.month
  const maxMonth = rows.at(-1)?.month

  function applyRange() {
    if (!fromMonth || !toMonth) {
      return
    }

    const rangeStart = fromMonth <= toMonth ? fromMonth : toMonth
    const rangeEnd = fromMonth <= toMonth ? toMonth : fromMonth
    const nextMissedMonths = new Set(missedMonths)

    for (const row of rows) {
      if (row.month < rangeStart || row.month > rangeEnd) {
        continue
      }

      if (rangeAction === "missed") {
        nextMissedMonths.add(row.month)
      } else {
        nextMissedMonths.delete(row.month)
      }
    }

    setMissedMonths(nextMissedMonths)
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 border border-border/70 p-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(10rem,0.9fr)_auto] md:items-end">
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">
          From
          <input
            className="h-8 border border-border bg-background px-2 text-xs text-foreground"
            disabled={disabled}
            max={maxMonth}
            min={minMonth}
            type="month"
            value={fromMonth}
            onChange={(event) => setFromMonth(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">
          To
          <input
            className="h-8 border border-border bg-background px-2 text-xs text-foreground"
            disabled={disabled}
            max={maxMonth}
            min={minMonth}
            type="month"
            value={toMonth}
            onChange={(event) => setToMonth(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-[11px] font-medium text-muted-foreground">
          Status
          <select
            className="h-8 border border-border bg-background px-2 text-xs text-foreground"
            disabled={disabled}
            value={rangeAction}
            onChange={(event) =>
              setRangeAction(event.target.value as "committed" | "missed")
            }
          >
            <option value="missed">Mark as missed</option>
            <option value="committed">Mark as committed</option>
          </select>
        </label>
        <Button
          disabled={disabled || rows.length === 0}
          size="sm"
          type="button"
          onClick={applyRange}
        >
          Apply
        </Button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto pr-1">
        <div className="space-y-4">
          {yearGroups.map((group) => (
            <section className="space-y-2" key={group.year}>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {group.year}
              </p>
              <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                {group.rows.map((row) => {
                  const isMissed = missedMonths.has(row.month)

                  return (
                    <label
                      className={cn(
                        "flex min-h-14 cursor-pointer flex-col justify-center border px-2 py-1.5 text-xs",
                        row.month === selectedMonth
                          ? "border-foreground bg-muted"
                          : "border-border/70 bg-background"
                      )}
                      key={row.month}
                    >
                      <input name="month" type="hidden" value={row.month} />
                      <span className="flex items-center gap-2">
                        <input
                          checked={isMissed}
                          className="size-3.5"
                          disabled={disabled}
                          name="defaultingMonth"
                          type="checkbox"
                          value={row.month}
                          onChange={(event) => {
                            const nextMissedMonths = new Set(missedMonths)

                            if (event.target.checked) {
                              nextMissedMonths.add(row.month)
                            } else {
                              nextMissedMonths.delete(row.month)
                            }

                            setMissedMonths(nextMissedMonths)
                          }}
                        />
                        <span className="font-semibold text-foreground">
                          {formatMonthOnly(row.period)}
                        </span>
                      </span>
                      <span className="mt-1 text-muted-foreground">
                        {isMissed
                          ? "Missed"
                          : row.status === "paused"
                            ? "Inactive"
                            : formatCurrency(row.savingsContribution)}
                      </span>
                    </label>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
