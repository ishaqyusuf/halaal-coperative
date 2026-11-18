/**
 * Range tool for the backfill "Missed months" grid. A month with no record
 * counts only as "no record" (ADR-20261116, 1.10), so nothing is chosen by
 * default: staff pick a From month, a To month and a status before any month
 * changes. Months start ticked only when a saved "Missed" record says so.
 */
export type MissedMonthsRangeAction = "missed" | "no-record"

export type MissedMonthsRangeSelection = {
  action: MissedMonthsRangeAction | ""
  fromMonth: string
  toMonth: string
}

export const initialMissedMonthsRange: MissedMonthsRangeSelection = {
  action: "",
  fromMonth: "",
  toMonth: "",
}

export const missedMonthsRangeActionOptions: Array<{
  label: string
  value: MissedMonthsRangeAction
}> = [
  { label: "Mark as missed", value: "missed" },
  { label: "Mark as no record", value: "no-record" },
]

export function initialMissedMonths(
  rows: ReadonlyArray<{ month: string; status?: string }>
) {
  return new Set(
    rows.filter((row) => row.status === "missed").map((row) => row.month)
  )
}

export function canApplyMissedMonthsRange(
  selection: MissedMonthsRangeSelection
) {
  return Boolean(selection.fromMonth && selection.toMonth && selection.action)
}

export function applyMissedMonthsRange(
  rows: ReadonlyArray<{ month: string }>,
  missedMonths: ReadonlySet<string>,
  selection: MissedMonthsRangeSelection
) {
  const next = new Set(missedMonths)
  if (!canApplyMissedMonthsRange(selection)) return next

  const { fromMonth, toMonth } = selection
  const rangeStart = fromMonth <= toMonth ? fromMonth : toMonth
  const rangeEnd = fromMonth <= toMonth ? toMonth : fromMonth

  for (const row of rows) {
    if (row.month < rangeStart || row.month > rangeEnd) continue
    if (selection.action === "missed") next.add(row.month)
    else next.delete(row.month)
  }

  return next
}
