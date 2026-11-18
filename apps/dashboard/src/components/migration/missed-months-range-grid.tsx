"use client"

import { useMemo, useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { Input } from "@halaalvest/ui/components/input"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import {
  applyMissedMonthsRange,
  canApplyMissedMonthsRange,
  initialMissedMonths,
  initialMissedMonthsRange,
  missedMonthsRangeActionOptions,
  type MissedMonthsRangeAction,
} from "./missed-months-range"

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
  // Nothing is chosen up front: a month with no record stays "no record".
  const [range, setRange] = useState(initialMissedMonthsRange)
  const [missedMonths, setMissedMonths] = useState(() =>
    initialMissedMonths(rows)
  )
  const yearGroups = useMemo(() => groupRowsByYear(rows), [rows])
  const minMonth = rows[0]?.month
  const maxMonth = rows.at(-1)?.month

  function applyRange() {
    setMissedMonths(applyMissedMonthsRange(rows, missedMonths, range))
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 border border-border/70 p-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(10rem,0.9fr)_auto] md:items-end">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          From
          <Input
            disabled={disabled}
            max={maxMonth}
            min={minMonth}
            type="month"
            value={range.fromMonth}
            onChange={(event) =>
              setRange({ ...range, fromMonth: event.target.value })
            }
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          To
          <Input
            disabled={disabled}
            max={maxMonth}
            min={minMonth}
            type="month"
            value={range.toMonth}
            onChange={(event) =>
              setRange({ ...range, toMonth: event.target.value })
            }
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Status
          <LabeledSelectInput
            disabled={disabled}
            options={missedMonthsRangeActionOptions}
            placeholder="Choose"
            value={range.action}
            onValueChange={(value) =>
              setRange({
                ...range,
                action: value as MissedMonthsRangeAction | "",
              })
            }
          />
        </label>
        <Button
          disabled={
            disabled || rows.length === 0 || !canApplyMissedMonthsRange(range)
          }
          size="sm"
          type="button"
          onClick={applyRange}
        >
          Set these months
        </Button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto pr-1">
        <div className="space-y-4">
          {yearGroups.map((group) => (
            <section className="space-y-2" key={group.year}>
              <p className="text-xs font-semibold text-muted-foreground">
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
                        <Checkbox
                          checked={isMissed}
                          disabled={disabled}
                          name="defaultingMonth"
                          value={row.month}
                          onCheckedChange={(checked) => {
                            const nextMissedMonths = new Set(missedMonths)

                            if (checked === true) {
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
