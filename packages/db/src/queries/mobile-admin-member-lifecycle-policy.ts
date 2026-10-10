import type {
  OverviewSummary,
  OverviewSummarySeverity,
} from "./dashboard"

const severityPriority: Record<OverviewSummarySeverity, number> = {
  critical: 0,
  warning: 1,
  neutral: 2,
}

/**
 * Keeps the mobile dashboard exception-led while preserving the canonical
 * dashboard order between items with the same severity.
 */
export function orderMobileAdminActionQueue(
  actionQueue: OverviewSummary["actionQueue"]
) {
  return actionQueue
    .map((item, index) => ({ index, item }))
    .filter(({ item }) => item.count > 0)
    .sort(
      (left, right) =>
        severityPriority[left.item.severity] -
          severityPriority[right.item.severity] || left.index - right.index
    )
    .map(({ item }) => item)
}
