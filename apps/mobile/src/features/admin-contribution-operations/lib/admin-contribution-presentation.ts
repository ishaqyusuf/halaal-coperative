export function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

export function formatCompactCurrency(value: number, currencyCode: string) {
  if (Math.abs(value) < 1_000) return formatCurrency(value, currencyCode)
  const divisor = Math.abs(value) >= 1_000_000 ? 1_000_000 : 1_000
  const suffix = divisor === 1_000_000 ? "m" : "k"
  return `${new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value / divisor)}${suffix}`
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

export function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function money(value: string) {
  const parsed = Number(value.replace(/,/g, ""))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}
