import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"

export type AnalyticsSummary = RouterOutputs["analytics"]["summary"]
export type AnalyticsPeriod =
  | "current_month"
  | "last_3_months"
  | "last_6_months"
  | "last_12_months"

export const analyticsPeriodOptions: Array<{
  label: string
  value: AnalyticsPeriod
}> = [
  { label: "This month", value: "current_month" },
  { label: "3M", value: "last_3_months" },
  { label: "6M", value: "last_6_months" },
  { label: "12M", value: "last_12_months" },
]

export function getCoverageTone(value: number) {
  if (value >= 0.9) return "positive"
  if (value >= 0.75) return "neutral"

  return "warning"
}

export function getRiskTone(value: number) {
  return value > 0 ? "warning" : "positive"
}

export function getBarWidth(value: number, max: number) {
  if (max <= 0) return "0%"

  return `${Math.min(100, Math.round((Math.max(0, value) / max) * 100))}%`
}
