const accessDate = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeZone: "Africa/Lagos",
})

const month = new Intl.DateTimeFormat("en-NG", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

export const defaultAccessQueue = { status: "pending", limit: 25 } as const

export const accessStatusLabel = {
  pending: "Awaiting approval",
  active: "Active",
  expired: "Expired",
  rejected: "Declined",
  revoked: "Revoked",
} as const

export function formatAccessDate(date: Date | string) {
  return accessDate.format(new Date(date))
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
