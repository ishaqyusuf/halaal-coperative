export type ReportsLaneParam = "activity" | "reports"

type Param = string | string[] | undefined

function first(value: Param) {
  return Array.isArray(value) ? value[0] : value
}

/** The lane a deep link asks for (`?lane=` or `?tab=`), or null to keep the current one. */
export function reportsLaneFromParams(params: { lane?: Param; tab?: Param }): ReportsLaneParam | null {
  const value = first(params.lane) ?? first(params.tab)
  return value === "activity" || value === "reports" ? value : null
}

/**
 * One string for every param that changes the tab's layout. When it changes
 * on a mounted screen, the lane re-syncs and the pager remounts: iOS can
 * leave a virtualized lane clipped (blank) after its container re-lays out
 * while the lane stays active, and only a remount re-measures it (T23 QA).
 */
export function reportsParamsKey(params: Record<string, Param>) {
  return Object.keys(params)
    .filter((key) => key !== "notificationEntityId" && params[key] !== undefined)
    .sort()
    .map((key) => `${key}=${String(first(params[key]))}`)
    .join("&")
}
