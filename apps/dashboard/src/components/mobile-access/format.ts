import { formatDayMonthYear } from "@/utils/format"

const lagosDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Lagos",
})

const month = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

/** "13 Nov 2026" in Lagos time, for moments such as approval or expiry. */
export function formatAccessDate(date: Date | string) {
  return lagosDate.format(new Date(date))
}

/** Calendar dates stored without a time (due dates). */
export function formatAccessDay(date: Date | string) {
  return formatDayMonthYear(date) ?? ""
}

export function formatBillingMonth(period: string) {
  return month.format(new Date(`${period}-01T00:00:00Z`))
}

export function formatAccessAmount(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`
}

/** The member's own status words. */
export const memberAccessStatusLabel = {
  pending: "Waiting",
  active: "You have the app",
  expired: "Ended",
  rejected: "Declined",
  revoked: "Turned off",
} as const
