import { appQueryKey, useInvalidateAppQueries } from "@/hooks/use-app-query"
import { getMobilePersistenceScope } from "@/runtime/persistence-scope"
import { useCallback, useState } from "react"
import type { FinancingLane } from "./admin-financing-operations-types"
import { financingLanes } from "./financing-presentation"

/** Exact query keys for financing operations, scoped to the session. */
export function financingKeys() {
  const scope = getMobilePersistenceScope()?.key
  return {
    item: (entityId: string) => appQueryKey("admin-financing-item", scope, entityId),
    lane: (lane: FinancingLane) => appQueryKey("admin-financing-lane", scope, lane),
    summary: appQueryKey("admin-financing-summary", scope),
  }
}

/**
 * After a decision, release or cycle change: refresh the summary (cycle and
 * counts), the lanes a record moves between, and the open record, in parallel.
 */
export function useRefreshFinancing() {
  const invalidate = useInvalidateAppQueries()
  return useCallback(
    (entityId?: string) => {
      const keys = financingKeys()
      return invalidate(
        keys.summary,
        ...financingLanes.map(({ value }) => keys.lane(value)),
        ...(entityId ? [keys.item(entityId)] : [])
      )
    },
    [invalidate]
  )
}

/** Spinner state for user pulls only (background refetches stay quiet). */
export function usePullRefresh(refresh: () => Promise<unknown>) {
  const [pulling, setPulling] = useState(false)
  const onRefresh = useCallback(() => {
    setPulling(true)
    void refresh().finally(() => setPulling(false))
  }, [refresh])
  return { onRefresh, refreshing: pulling }
}
