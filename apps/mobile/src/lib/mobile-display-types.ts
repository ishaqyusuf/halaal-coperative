export type MobileMetricFormat = "currency" | "percent" | "count"

export type MobileOverviewMetric = {
  detail: string
  format: MobileMetricFormat
  key: string
  label: string
  value: number
}
