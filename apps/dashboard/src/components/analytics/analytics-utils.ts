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
  { label: "3 months", value: "last_3_months" },
  { label: "6 months", value: "last_6_months" },
  { label: "12 months", value: "last_12_months" },
]

/** Share of what was expected, 0 when nothing was expected. */
export function getPaidShare(received: number, expected: number) {
  if (expected <= 0) return null
  return Math.round((received / expected) * 100)
}

export function sumMonths<K extends string>(
  months: Array<Record<K, number>>,
  key: K
) {
  return months.reduce((total, month) => total + month[key], 0)
}
