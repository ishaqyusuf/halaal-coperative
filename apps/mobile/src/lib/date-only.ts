export type DateOnlyParts = {
  day: number
  month: number
  year: number
}

export type CalendarDay = DateOnlyParts & {
  inCurrentMonth: boolean
  value: string
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseDateOnly(value: string): DateOnlyParts | null {
  const match = DATE_ONLY_PATTERN.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const candidate = new Date(Date.UTC(year, month - 1, day, 12))

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null
  }

  return { day, month, year }
}

export function toDateOnly({ day, month, year }: DateOnlyParts) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function toUtcDate(parts: DateOnlyParts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12))
}

export function isValidDateOnly(value: string) {
  return parseDateOnly(value) !== null
}

export function compareDateOnly(left: string, right: string) {
  const leftParts = parseDateOnly(left)
  const rightParts = parseDateOnly(right)
  if (!leftParts || !rightParts) return Number.NaN

  return Math.sign(
    toUtcDate(leftParts).getTime() - toUtcDate(rightParts).getTime()
  )
}

export function formatDateOnly(value: string) {
  const parts = parseDateOnly(value)
  if (!parts) return value

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(toUtcDate(parts))
}

export function todayDateOnly(now = new Date()) {
  return toDateOnly({
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  })
}

export function addMonthsDateOnly(value: string, amount: number) {
  const parts = parseDateOnly(value)
  if (!parts) return value

  const targetMonthStart = new Date(
    Date.UTC(parts.year, parts.month - 1 + amount, 1, 12)
  )
  const daysInTargetMonth = new Date(
    Date.UTC(
      targetMonthStart.getUTCFullYear(),
      targetMonthStart.getUTCMonth() + 1,
      0,
      12
    )
  ).getUTCDate()

  return toDateOnly({
    day: Math.min(parts.day, daysInTargetMonth),
    month: targetMonthStart.getUTCMonth() + 1,
    year: targetMonthStart.getUTCFullYear(),
  })
}

export function shiftCalendarMonth(parts: DateOnlyParts, amount: number) {
  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1 + amount, 1, 12)
  )
  return {
    day: 1,
    month: shifted.getUTCMonth() + 1,
    year: shifted.getUTCFullYear(),
  }
}

export function buildCalendarDays(month: DateOnlyParts): CalendarDay[] {
  const firstOfMonth = new Date(Date.UTC(month.year, month.month - 1, 1, 12))
  const gridStart = new Date(
    Date.UTC(month.year, month.month - 1, 1 - firstOfMonth.getUTCDay(), 12)
  )

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setUTCDate(gridStart.getUTCDate() + index)
    const parts = {
      day: date.getUTCDate(),
      month: date.getUTCMonth() + 1,
      year: date.getUTCFullYear(),
    }
    return {
      ...parts,
      inCurrentMonth: parts.month === month.month && parts.year === month.year,
      value: toDateOnly(parts),
    }
  })
}

export function clampDateOnly(
  value: string,
  minimumDate?: string,
  maximumDate?: string
) {
  if (minimumDate && compareDateOnly(value, minimumDate) < 0) return minimumDate
  if (maximumDate && compareDateOnly(value, maximumDate) > 0) return maximumDate
  return value
}
