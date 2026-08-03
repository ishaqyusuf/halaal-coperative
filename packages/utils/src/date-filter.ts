export const dateFilterPresets = [
  "yesterday",
  "today",
  "this week",
  "last week",
  "this month",
  "last month",
  "last 2 months",
  "last 3 months",
  "last 6 months",
  "before last month",
  "before last 3 months",
  "before last 6 months",
] as const

export type DateFilterPreset = (typeof dateFilterPresets)[number]

export type DateFilterValue =
  | string
  | readonly (string | null | undefined)[]
  | null
  | undefined

export type ResolvedDateFilter = {
  from?: string
  to?: string
}

const datePresetLabels: Record<DateFilterPreset, string> = {
  "before last 3 months": "Over 3 months",
  "before last 6 months": "Over 6 months",
  "before last month": "Over a month",
  "last 2 months": "Last 2 months",
  "last 3 months": "Last 3 months",
  "last 6 months": "Last 6 months",
  "last month": "Last month",
  "last week": "Last week",
  "this month": "This month",
  "this week": "This week",
  today: "Today",
  yesterday: "Yesterday",
}

export function isDateFilterPreset(value: string): value is DateFilterPreset {
  return dateFilterPresets.includes(value as DateFilterPreset)
}

export function getDatePresetLabel(value: string) {
  return isDateFilterPreset(value) ? datePresetLabels[value] : value
}

export function createDatePresetSelection(
  preset: DateFilterPreset
): [DateFilterPreset] {
  return [preset]
}

export function resolveDateFilter(
  value: DateFilterValue,
  referenceDate: Date = new Date()
): ResolvedDateFilter | null | undefined {
  const parts = typeof value === "string" ? [value] : value

  if (!parts?.length) {
    return undefined
  }

  const first = normalizePart(parts[0])
  const second = normalizePart(parts[1])

  if (first && isDateFilterPreset(first)) {
    return resolvePreset(first, referenceDate)
  }

  const from = first === "-" || !first ? undefined : parseDateOnly(first)
  const to = second === "-" || !second ? undefined : parseDateOnly(second)

  if ((first && first !== "-" && !from) || (second && second !== "-" && !to)) {
    return null
  }

  if (!from && !to) {
    return null
  }

  if (from && to && from.getTime() > to.getTime()) {
    return null
  }

  return {
    ...(from ? { from: formatDateOnly(from) } : {}),
    ...(to ? { to: formatDateOnly(to) } : {}),
  }
}

function resolvePreset(
  preset: DateFilterPreset,
  referenceDate: Date
): ResolvedDateFilter | null {
  if (Number.isNaN(referenceDate.getTime())) {
    return null
  }

  const today = utcDate(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  )

  switch (preset) {
    case "today":
      return dateRange(today, today)
    case "yesterday": {
      const yesterday = addUtcDays(today, -1)
      return dateRange(yesterday, yesterday)
    }
    case "this week": {
      const from = addUtcDays(today, -today.getUTCDay())
      return dateRange(from, addUtcDays(from, 6))
    }
    case "last week": {
      const thisWeek = addUtcDays(today, -today.getUTCDay())
      const from = addUtcDays(thisWeek, -7)
      return dateRange(from, addUtcDays(from, 6))
    }
    case "this month":
      return dateRange(startOfUtcMonth(today), endOfUtcMonth(today))
    case "last month":
      return completePreviousMonths(today, 1)
    case "last 2 months":
      return completePreviousMonths(today, 2)
    case "last 3 months":
      return completePreviousMonths(today, 3)
    case "last 6 months":
      return completePreviousMonths(today, 6)
    case "before last month":
      return beforePreviousMonths(today, 1)
    case "before last 3 months":
      return beforePreviousMonths(today, 3)
    case "before last 6 months":
      return beforePreviousMonths(today, 6)
  }
}

function completePreviousMonths(referenceDate: Date, months: number) {
  const from = addUtcMonths(startOfUtcMonth(referenceDate), -months)
  const to = addUtcDays(startOfUtcMonth(referenceDate), -1)
  return dateRange(from, to)
}

function beforePreviousMonths(referenceDate: Date, months: number) {
  const cutoffMonth = addUtcMonths(
    startOfUtcMonth(referenceDate),
    -(months + 1)
  )
  return { to: formatDateOnly(endOfUtcMonth(cutoffMonth)) }
}

function dateRange(from: Date, to: Date): ResolvedDateFilter {
  return {
    from: formatDateOnly(from),
    to: formatDateOnly(to),
  }
}

function normalizePart(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase()
  return normalized || undefined
}

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = utcDate(year, month, day)

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day))
}

function addUtcDays(date: Date, days: number) {
  return utcDate(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + days
  )
}

function addUtcMonths(date: Date, months: number) {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
}

function startOfUtcMonth(date: Date) {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), 1)
}

function endOfUtcMonth(date: Date) {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
}
