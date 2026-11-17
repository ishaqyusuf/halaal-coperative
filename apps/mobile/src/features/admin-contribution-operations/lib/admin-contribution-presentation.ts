import { formatCompactMoney, formatMoney } from "@/lib/money"

export function formatCurrency(value: number, currencyCode: string) {
  return formatMoney(value, { currencyCode })
}

export function formatCompactCurrency(value: number, currencyCode: string) {
  return formatCompactMoney(value, currencyCode)
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/** "3 Nov 2026" from an ISO timestamp or date-only string (UTC parts). */
export function formatDate(value: string) {
  const date = new Date(value)
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** "3 Nov" for rows in the current year. */
export function formatShortDate(value: string, now = new Date()) {
  const date = new Date(value)
  return date.getUTCFullYear() === now.getUTCFullYear()
    ? `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
    : formatDate(value)
}
