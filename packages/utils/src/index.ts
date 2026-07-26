const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat("en-NG", {
  style: "percent",
  maximumFractionDigits: 0,
})

export * from "./tenant-domains"
export * from "./filters"
export * from "./qa-testing"
export * from "./runtime-url"

export function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

export function formatPercent(value: number) {
  return percentFormatter.format(value)
}
