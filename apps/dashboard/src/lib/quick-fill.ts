import { z } from "zod"

export type QuickFillInterval = "monthly" | "yearly"

type QuickFillRowSetter<TRow> = (
  updater: (currentRows: TRow[]) => TRow[]
) => void
type QuickFillRowPredicate<TRow> = {
  bivarianceHack(row: TRow): boolean
}["bivarianceHack"]
type QuickFillRowSorter<TRow> = {
  bivarianceHack(a: TRow, b: TRow): number
}["bivarianceHack"]

type BaseQuickFillArgs<TRow> = {
  createRow: () => TRow
  disabled?: boolean
  hasValue: QuickFillRowPredicate<TRow>
  maxDate?: string | null
  minDate?: string | null
  rows: TRow[]
  setRows: QuickFillRowSetter<TRow>
  sortRows: QuickFillRowSorter<TRow>
}

export type ChargeHistoryQuickFillRow = {
  amount: string
  effectiveFrom: string
}

export type ShareHistoryQuickFillRow = {
  amount: string
  effectiveFrom: string
  valueType: "fixed_amount" | "percentage"
}

export type BusinessProfitHistoryQuickFillRow = {
  amount: string
  deductionAmount: string
  profitDate: string
  reason: string
}

export type ChargeHistoryQuickFillTemplate = {
  amount: string
}

export type ShareHistoryQuickFillTemplate = {
  amount: string
  valueType: "fixed_amount" | "percentage"
}

export type BusinessProfitHistoryQuickFillTemplate = {
  amount: string
  deductionAmount: string
  reason: string
}

export type ChargeHistoryQuickFillArgs<
  TRow extends ChargeHistoryQuickFillRow = ChargeHistoryQuickFillRow,
> = BaseQuickFillArgs<TRow>

export type ShareHistoryQuickFillArgs<
  TRow extends ShareHistoryQuickFillRow = ShareHistoryQuickFillRow,
> = BaseQuickFillArgs<TRow>

export type BusinessProfitHistoryQuickFillArgs<
  TRow extends BusinessProfitHistoryQuickFillRow = BusinessProfitHistoryQuickFillRow,
> = BaseQuickFillArgs<TRow>

function functionSchema<TFunction>() {
  return z.custom<TFunction>((value) => typeof value === "function")
}

function rowsSchema<TRow>() {
  return z.custom<TRow[]>((value) => Array.isArray(value))
}

function createQuickFillArgsSchema<TName extends string, TRow>(name: TName) {
  return z.object({
    createRow: functionSchema<() => TRow>(),
    disabled: z.boolean().optional(),
    hasValue: functionSchema<QuickFillRowPredicate<TRow>>(),
    maxDate: z.string().nullable().optional(),
    minDate: z.string().nullable().optional(),
    name: z.literal(name),
    rows: rowsSchema<TRow>(),
    setRows: functionSchema<QuickFillRowSetter<TRow>>(),
    sortRows: functionSchema<QuickFillRowSorter<TRow>>(),
  })
}

export const quickFillArgsSchema = z.discriminatedUnion("name", [
  createQuickFillArgsSchema<
    "businessProfitHistory",
    BusinessProfitHistoryQuickFillRow
  >("businessProfitHistory"),
  createQuickFillArgsSchema<"chargeHistory", ChargeHistoryQuickFillRow>(
    "chargeHistory"
  ),
  createQuickFillArgsSchema<"shareHistory", ShareHistoryQuickFillRow>(
    "shareHistory"
  ),
])

export type QuickFillArgsInput = z.infer<typeof quickFillArgsSchema>
export type QuickFillName = QuickFillArgsInput["name"]
export type QuickFillArgsFor<Name extends QuickFillName> = Extract<
  QuickFillArgsInput,
  { name: Name }
>
export type QuickFillArgs = {
  [Name in QuickFillName]: Omit<QuickFillArgsFor<Name>, "name">
}

export function parseQuickFillArgs<Name extends QuickFillName>(
  input: QuickFillArgsFor<Name>
) {
  return quickFillArgsSchema.parse(input) as QuickFillArgsFor<Name>
}

export type QuickFillTemplateFor<Name extends QuickFillName> =
  Name extends "chargeHistory"
    ? ChargeHistoryQuickFillTemplate
    : Name extends "shareHistory"
      ? ShareHistoryQuickFillTemplate
      : BusinessProfitHistoryQuickFillTemplate

type QuickFillDefinition<TArgs, TTemplate> = {
  fill: (input: {
    args: TArgs
    dates: string[]
    template: TTemplate
  }) => void
  initialTemplate: TTemplate
  title: string
}

function parseDateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return null
  }

  return { day, month, year }
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function formatDateParts(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`
}

function addIntervalDate(
  startDate: string,
  index: number,
  interval: QuickFillInterval
) {
  const parts = parseDateParts(startDate)

  if (!parts) {
    throw new Error("Start date is invalid.")
  }

  const monthOffset = interval === "monthly" ? index : index * 12
  const zeroBasedMonth = parts.month - 1 + monthOffset
  const year = parts.year + Math.floor(zeroBasedMonth / 12)
  const month = (zeroBasedMonth % 12) + 1
  const day = Math.min(parts.day, daysInMonth(year, month))

  return formatDateParts(year, month, day)
}

export function buildQuickFillDates({
  endDate,
  interval,
  maxDate,
  minDate,
  startDate,
}: {
  endDate: string
  interval: QuickFillInterval
  maxDate?: string | null
  minDate?: string | null
  startDate: string
}) {
  if (!startDate || !endDate) {
    throw new Error("Quick fill needs a start date and end date.")
  }

  if (endDate < startDate) {
    throw new Error("Quick fill end date cannot be before the start date.")
  }

  if (minDate && startDate < minDate) {
    throw new Error(`Quick fill start date cannot be before ${minDate}.`)
  }

  if (maxDate && endDate > maxDate) {
    throw new Error(`Quick fill end date cannot be after ${maxDate}.`)
  }

  const dates: string[] = []

  for (let index = 0; index < 240; index += 1) {
    const nextDate = addIntervalDate(startDate, index, interval)

    if (nextDate > endDate) {
      break
    }

    dates.push(nextDate)
  }

  if (dates.length === 240) {
    const nextDate = addIntervalDate(startDate, 240, interval)

    if (nextDate <= endDate) {
      throw new Error("Quick fill can generate at most 240 rows at once.")
    }
  }

  return dates
}

export function mergeRowsByDate<TRow>({
  blankRow,
  dates,
  getDate,
  hasValue,
  rows,
  rowForDate,
  sortRows,
}: {
  blankRow: () => TRow
  dates: string[]
  getDate: (row: TRow) => string
  hasValue: (row: TRow) => boolean
  rows: TRow[]
  rowForDate: (date: string) => TRow
  sortRows: (a: TRow, b: TRow) => number
}) {
  const valuedRows = rows.filter(hasValue)
  const existingDates = new Set(valuedRows.map(getDate).filter(Boolean))
  const generatedRows = dates
    .filter((date) => !existingDates.has(date))
    .map(rowForDate)

  return [...valuedRows, ...generatedRows].sort(sortRows).concat(blankRow())
}

function fillChargeHistory<TRow extends ChargeHistoryQuickFillRow>({
  args,
  dates,
  template,
}: {
  args: ChargeHistoryQuickFillArgs<TRow>
  dates: string[]
  template: ChargeHistoryQuickFillTemplate
}) {
  if (!template.amount) {
    throw new Error("Set an amount before quick filling charges.")
  }

  args.setRows((currentRows) =>
    mergeRowsByDate({
      blankRow: args.createRow,
      dates,
      getDate: (row) => row.effectiveFrom,
      hasValue: args.hasValue,
      rowForDate: (date) =>
        ({
          ...args.createRow(),
          amount: template.amount,
          effectiveFrom: date,
        }) as TRow,
      rows: currentRows,
      sortRows: args.sortRows,
    })
  )
}

function fillShareHistory<TRow extends ShareHistoryQuickFillRow>({
  args,
  dates,
  template,
}: {
  args: ShareHistoryQuickFillArgs<TRow>
  dates: string[]
  template: ShareHistoryQuickFillTemplate
}) {
  if (!template.amount) {
    throw new Error("Set a value before quick filling shares.")
  }

  args.setRows((currentRows) =>
    mergeRowsByDate({
      blankRow: args.createRow,
      dates,
      getDate: (row) => row.effectiveFrom,
      hasValue: args.hasValue,
      rowForDate: (date) =>
        ({
          ...args.createRow(),
          amount: template.amount,
          effectiveFrom: date,
          valueType: template.valueType,
        }) as TRow,
      rows: currentRows,
      sortRows: args.sortRows,
    })
  )
}

function parseOptionalAmount(value: string | undefined) {
  const amount = Number(value || 0)

  return Number.isFinite(amount) ? amount : 0
}

function fillBusinessProfitHistory<
  TRow extends BusinessProfitHistoryQuickFillRow,
>({
  args,
  dates,
  template,
}: {
  args: BusinessProfitHistoryQuickFillArgs<TRow>
  dates: string[]
  template: BusinessProfitHistoryQuickFillTemplate
}) {
  const profitAmount = parseOptionalAmount(template.amount)
  const deductionAmount = parseOptionalAmount(template.deductionAmount)

  if (!template.amount) {
    throw new Error("Set an amount before quick filling.")
  }

  if (deductionAmount < 0) {
    throw new Error("Deduction cannot be negative.")
  }

  if (deductionAmount > profitAmount) {
    throw new Error("Deduction cannot exceed profit amount.")
  }

  if (deductionAmount > 0 && !template.reason.trim()) {
    throw new Error("Add a reason before quick filling deducted profit rows.")
  }

  args.setRows((currentRows) =>
    mergeRowsByDate({
      blankRow: args.createRow,
      dates,
      getDate: (row) => row.profitDate,
      hasValue: args.hasValue,
      rowForDate: (date) =>
        ({
          ...args.createRow(),
          amount: template.amount,
          deductionAmount: template.deductionAmount || "0",
          profitDate: date,
          reason: template.reason,
        }) as TRow,
      rows: currentRows,
      sortRows: args.sortRows,
    })
  )
}

export const quickFillers = {
  businessProfitHistory: {
    fill: fillBusinessProfitHistory,
    initialTemplate: {
      amount: "",
      deductionAmount: "0",
      reason: "",
    },
    title: "Quick fill profit history",
  } satisfies QuickFillDefinition<
    BusinessProfitHistoryQuickFillArgs,
    BusinessProfitHistoryQuickFillTemplate
  >,
  chargeHistory: {
    fill: fillChargeHistory,
    initialTemplate: {
      amount: "",
    },
    title: "Quick fill charge history",
  } satisfies QuickFillDefinition<
    ChargeHistoryQuickFillArgs,
    ChargeHistoryQuickFillTemplate
  >,
  shareHistory: {
    fill: fillShareHistory,
    initialTemplate: {
      amount: "",
      valueType: "fixed_amount",
    },
    title: "Quick fill share history",
  } satisfies QuickFillDefinition<
    ShareHistoryQuickFillArgs,
    ShareHistoryQuickFillTemplate
  >,
}
