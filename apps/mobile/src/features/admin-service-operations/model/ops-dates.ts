const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "17 Nov" or "17 Nov 2026" from an ISO timestamp or a date-only string. */
export function shortDate(value: string, withYear = false) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value)
  return `${date.getDate()} ${months[date.getMonth()]}${withYear ? ` ${date.getFullYear()}` : ""}`
}
