const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat("en-NG", {
  style: "percent",
  maximumFractionDigits: 0,
})

export * from "./tenant-domains.js"

export function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

export function formatPercent(value: number) {
  return percentFormatter.format(value)
}
