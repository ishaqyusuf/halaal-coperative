import { appQueryKey } from "@/hooks/use-app-query"
import { getMobilePersistenceScope } from "@/runtime/persistence-scope"
import { useCallback, useEffect, useState } from "react"
import type { AdminReportActivityFilters } from "./admin-reports-access-types"

/** Exact query keys for the reports tab, scoped to the session. */
export function reportKeys() {
  const scope = getMobilePersistenceScope()?.key
  return {
    /** One page set per filter, so a filter change reads activity only. */
    activity: (filters: AdminReportActivityFilters) =>
      appQueryKey(
        "admin-reports-activity",
        scope,
        filters.search ?? "",
        filters.action ?? "",
        filters.area ?? "",
        filters.fromDate ?? "",
        filters.toDate ?? ""
      ),
    /** Prefix of every activity page set (refresh after a write). */
    activityAll: appQueryKey("admin-reports-activity", scope),
    event: (id: string) => appQueryKey("admin-reports-activity-event", scope, id),
    overview: appQueryKey("admin-reports-overview", scope),
  }
}

/**
 * Pull-to-refresh state that is true only for a pull the user made, so a
 * background refetch never leaves the iOS spinner on screen (T18 QA).
 */
export function usePullRefresh(refresh: () => Promise<unknown>) {
  const [pulling, setPulling] = useState(false)
  const onRefresh = useCallback(() => {
    setPulling(true)
    void refresh().finally(() => setPulling(false))
  }, [refresh])
  return { onRefresh, refreshing: pulling }
}

/** A clock that ticks while `active` (file countdowns); idle otherwise. */
export function useNow(active: boolean, intervalMs = 1_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [active, intervalMs])
  return now
}
