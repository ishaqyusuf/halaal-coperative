const dayMonthYear = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
})

/** "13 Nov 2026": easier to read than an ISO date. Dates are calendar days (UTC). */
export function formatDayMonthYear(value: Date | string | null | undefined) {
  if (!value) {
    return null
  }

  const date = typeof value === "string" ? new Date(value) : value

  return Number.isNaN(date.getTime()) ? null : dayMonthYear.format(date)
}
