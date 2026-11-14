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

const dateAndTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  hour: "numeric",
  hour12: true,
  minute: "2-digit",
  month: "short",
  timeZone: "Africa/Lagos",
  year: "numeric",
})

/** "14 Nov 2026 at 7:34 am" in Nigerian time: for activity entries. */
export function formatDateAndTime(value: Date | string | null | undefined) {
  if (!value) {
    return null
  }

  const date = typeof value === "string" ? new Date(value) : value

  return Number.isNaN(date.getTime()) ? null : dateAndTime.format(date)
}

/** Short naira amounts for chart scales: "₦13m", "₦6.5m", "₦250k", "₦900". */
export function formatCompactNaira(value: number) {
  const amount = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  const trim = (n: number) =>
    n >= 10 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString()

  if (amount >= 1_000_000_000)
    return `${sign}₦${trim(amount / 1_000_000_000)}bn`
  if (amount >= 1_000_000) return `${sign}₦${trim(amount / 1_000_000)}m`
  if (amount >= 1_000) return `${sign}₦${trim(amount / 1_000)}k`
  return `${sign}₦${Math.round(amount)}`
}
