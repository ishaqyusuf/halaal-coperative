import { type MobileOverviewMetric } from "@/lib/mobile-home-api"

export function formatMobileMetricValue(
  metric: MobileOverviewMetric,
  currencyCode: string
) {
  if (metric.format === "currency") {
    return new Intl.NumberFormat("en-NG", {
      currency: currencyCode,
      maximumFractionDigits: 1,
      notation: "compact",
      style: "currency",
    }).format(metric.value)
  }

  if (metric.format === "percent") {
    return new Intl.NumberFormat("en-NG", {
      maximumFractionDigits: 0,
      style: "percent",
    }).format(metric.value)
  }

  return new Intl.NumberFormat("en-NG").format(metric.value)
}
