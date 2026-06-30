import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"

export type OverviewSummary = RouterOutputs["overview"]["summary"]
export type OverviewActionQueueItem = OverviewSummary["actionQueue"][number]
export type OverviewComplianceItem = OverviewSummary["complianceWatch"][number]
export type OverviewActivityItem = OverviewSummary["recentActivity"][number]

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

export function getMetricTone(value: number, threshold: number) {
  return value > threshold ? "warning" : "positive"
}

export function getCoverageTone(value: number) {
  if (value >= 0.9) return "positive"
  if (value >= 0.75) return "neutral"

  return "warning"
}

export function getSeverityTone(
  severity: OverviewActionQueueItem["severity"]
) {
  if (severity === "critical") return "warning"

  return severity
}
