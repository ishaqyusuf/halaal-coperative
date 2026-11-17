import {
  appQueryKey,
  useAppInfiniteQuery,
  useAppQuery,
  useInvalidateAppQueries,
} from "@/hooks/use-app-query"
import { useDebounce } from "@/hooks/use-debounce"
import { readErrorCode } from "@/lib/app-query-policy"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { getMobilePersistenceScope } from "@/runtime/persistence-scope"
import { useCallback, useState } from "react"
import {
  getRepaymentFacility,
  getRepaymentOperationsSummary,
  getRepaymentOperationsWorkspace,
} from "../api/admin-repayment-operations-api"
import type {
  RepaymentLane,
  RepaymentWorkspace,
} from "../model/admin-repayment-operations-types"
import { uniqueRows } from "../model/admin-repayment-presentation"

const feature = "admin-repayments"

export function repaymentKeys(scope = getMobilePersistenceScope()?.key) {
  return {
    facility: (loanId: string | null) =>
      appQueryKey(feature, scope, "facility", loanId),
    /** Prefix for one lane across every search term. */
    lane: (lane: RepaymentLane) => appQueryKey(feature, scope, "lane", lane),
    laneSearch: (lane: RepaymentLane, term: string) =>
      appQueryKey(feature, scope, "lane", lane, term),
    summary: appQueryKey(feature, scope, "summary"),
  }
}

/**
 * One lane's paged read. Lanes mount lazily (SegmentedPager keeps them), so a
 * lane is fetched when it is first shown and kept while the admin switches.
 */
function useRepaymentLane(
  lane: RepaymentLane,
  term: string,
  enabled: boolean,
  offline: boolean
) {
  const keys = repaymentKeys()
  const query = useAppInfiniteQuery({
    enabled,
    getNextPageParam: (page: RepaymentWorkspace) => page.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      getRepaymentOperationsWorkspace({
        cursor: pageParam,
        lane,
        search: term || undefined,
      }),
    queryKey: keys.laneSearch(lane, term),
    selectItems: (page: RepaymentWorkspace) => page.items,
  })
  const first = query.data?.pages[0]
  return {
    capabilities: first?.capabilities,
    currencyCode: first?.currencyCode,
    error: query.isError,
    fetchingNext: query.isFetchingNextPage,
    hasData: Boolean(first),
    hasNext: Boolean(query.hasNextPage),
    items: uniqueRows(query.items),
    loading: query.isPending && enabled,
    nextPage: () => {
      if (!offline && !query.isFetching) query.onEndReached()
    },
    refetch: () => query.refetch({ cancelRefetch: false }),
    refreshing: query.isRefetching && !query.isFetchingNextPage,
    stale: isMobileReadCacheStale(first?.cache),
    // keepPreviousData shows the last term's rows while a new term loads.
    updating: query.isPlaceholderData,
    updatedAt: first?.cache?.cachedAt ?? first?.generatedAt,
  }
}

export function useAdminRepayments(offline: boolean) {
  const [lane, setLane] = useState<RepaymentLane>("due")
  const [visited, setVisited] = useState<Record<RepaymentLane, boolean>>({
    collections: false,
    due: true,
    posted: false,
  })
  const [search, setSearch] = useState("")
  const term = useDebounce(search.trim().slice(0, 120), 350)
  const keys = repaymentKeys()

  const summary = useAppQuery({
    queryFn: getRepaymentOperationsSummary,
    queryKey: keys.summary,
  })
  const lanes = {
    collections: useRepaymentLane(
      "collections",
      term,
      visited.collections,
      offline
    ),
    due: useRepaymentLane("due", term, visited.due, offline),
    posted: useRepaymentLane("posted", term, visited.posted, offline),
  }
  const active = lanes[lane]
  const code = readErrorCode(summary.error)
  const accessLost = code === "FORBIDDEN" || code === "UNAUTHORIZED"

  const selectLane = useCallback((next: RepaymentLane) => {
    setLane(next)
    setVisited((current) =>
      current[next] ? current : { ...current, [next]: true }
    )
  }, [])

  const refresh = () => {
    void summary.refetch({ cancelRefetch: false })
    void active.refetch()
  }

  return {
    accessLost,
    active,
    capabilities: lanes.due.capabilities ?? active.capabilities,
    currencyCode:
      summary.data?.currencyCode ?? active.currencyCode ?? "NGN",
    lane,
    lanes,
    refresh,
    refreshing: summary.isRefetching || active.refreshing,
    search,
    searchTerm: term,
    selectLane,
    setSearch,
    stale: isMobileReadCacheStale(summary.data?.cache) || active.stale,
    summary: accessLost ? undefined : summary.data,
    summaryError: summary.isError,
    summaryLoading: summary.isPending,
    updatedAt: summary.data?.cache?.cachedAt ?? summary.data?.generatedAt,
  }
}

/** Facility detail, cached per loan (re-opening a facility is instant). */
export function useRepaymentFacility(loanId: string | null) {
  return useAppQuery({
    enabled: Boolean(loanId),
    // Another facility's rows must never stand in for this one.
    placeholderData: undefined,
    queryFn: () => getRepaymentFacility(loanId!),
    queryKey: repaymentKeys().facility(loanId),
  })
}

/**
 * After a write: the summary, the lanes the write changes (with every
 * loaded page, so paged rows stay) and that facility. Nothing else.
 */
export function useRepaymentInvalidation() {
  const invalidate = useInvalidateAppQueries()
  return useCallback(
    (kind: "followUp" | "repayment", loanId: string) => {
      const keys = repaymentKeys()
      return invalidate(
        keys.summary,
        keys.lane("due"),
        keys.lane("collections"),
        ...(kind === "repayment" ? [keys.lane("posted")] : []),
        keys.facility(loanId)
      )
    },
    [invalidate]
  )
}
