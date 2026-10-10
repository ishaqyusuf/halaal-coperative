import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import type { MobileMemberHome } from "./member-core-types"

export function buildMemberHomePresentation(
  home: MobileMemberHome | null,
  currencyCode: string
) {
  if (!home)
    return {
      readinessPercentage: null,
      services: [],
      stats: [],
    }

  return {
    readinessPercentage: home.readiness.percentage,
    services: home.services,
    stats: home.stats.map((metric) => ({
      detail: metric.detail,
      label: metric.label,
      value: formatMobileMetricValue(metric, currencyCode),
    })),
  }
}
