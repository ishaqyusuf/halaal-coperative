import { appQueryKey, useInvalidateAppQueries } from "@/hooks/use-app-query"
import { useCallback, useState } from "react"
import { getMobilePersistenceScope } from "@/runtime/persistence-scope"
import type { ContributionLane } from "./admin-contribution-operations-types"

/** Exact query keys for the contributions screens, scoped to the session. */
export function contributionKeys() {
  const scope = getMobilePersistenceScope()?.key
  return {
    batch: (batchId: string) =>
      appQueryKey("admin-contributions-batch", scope, batchId),
    lane: (lane: ContributionLane) =>
      appQueryKey("admin-contributions-lane", scope, lane),
    member: (memberId: string) =>
      appQueryKey("admin-contributions-member", scope, memberId),
    summary: appQueryKey("admin-contributions-summary", scope),
  }
}

export type ContributionRefresh = {
  batchId?: string
  lanes?: ContributionLane[]
  memberId?: string
}

/**
 * After a write, refresh only what it changed, in parallel: the summary,
 * the affected lanes and the open member or batch.
 */
export function useRefreshContributions() {
  const invalidate = useInvalidateAppQueries()
  return ({ batchId, lanes = [], memberId }: ContributionRefresh) => {
    const keys = contributionKeys()
    return invalidate(
      keys.summary,
      ...lanes.map((lane) => keys.lane(lane)),
      ...(memberId ? [keys.member(memberId)] : []),
      ...(batchId ? [keys.batch(batchId)] : [])
    )
  }
}

/**
 * Pull-to-refresh state that is true only for a pull the user made. Driving
 * RefreshControl from a background refetch (after a write) left the iOS
 * spinner stuck on screen (T18 device QA).
 */
export function usePullRefresh(refresh: () => Promise<unknown>) {
  const [pulling, setPulling] = useState(false)
  const onRefresh = useCallback(() => {
    setPulling(true)
    void refresh().finally(() => setPulling(false))
  }, [refresh])
  return { onRefresh, refreshing: pulling }
}
