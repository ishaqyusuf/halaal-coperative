import type { MobileAdminOverview } from "./admin-member-lifecycle-types"

export type AdminOverviewPresentation = {
  decisionCount: number
  primaryMetric: MobileAdminOverview["stats"][number] | null
  schedulePercentage: number | null
  supportingMetrics: MobileAdminOverview["stats"]
}

function parsePercentage(detail: string) {
  const match = detail.match(/(?:^|\s)(\d{1,3}(?:\.\d+)?)%(?!\d)/)
  if (!match?.[1]) return null

  const value = Number(match[1])
  if (!Number.isFinite(value) || value < 0 || value > 100) return null

  return value
}

export function buildAdminOverviewPresentation(
  overview: MobileAdminOverview
): AdminOverviewPresentation {
  const primaryMetric =
    overview.stats.find((metric) => metric.key === "collections") ??
    overview.stats[0] ??
    null

  return {
    decisionCount: overview.actionQueue.reduce(
      (total, item) => total + item.count,
      0
    ),
    primaryMetric,
    schedulePercentage: primaryMetric
      ? parsePercentage(primaryMetric.detail)
      : null,
    supportingMetrics: primaryMetric
      ? overview.stats.filter((metric) => metric !== primaryMetric)
      : [],
  }
}
