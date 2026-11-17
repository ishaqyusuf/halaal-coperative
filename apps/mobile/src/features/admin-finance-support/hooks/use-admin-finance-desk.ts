import { appQueryKey, useAppInfiniteQuery } from "@/hooks/use-app-query"
import { useDebounce } from "@/hooks/use-debounce"
import { readErrorCode } from "@/lib/app-query-policy"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { getMobilePersistenceScope } from "@/runtime/persistence-scope"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import { getAdminFinanceDesk } from "../api/admin-finance-support-api"
import { matchesFinanceDeskSearch } from "../model/admin-finance-support-presentation"
import type {
  AdminFinanceSupportItem,
  AdminFinanceSupportQueueKey,
  FinanceDeskCursor,
} from "../model/admin-finance-support-types"

export type FinanceDeskLane = "all" | AdminFinanceSupportQueueKey

const feature = "admin-finance-desk"
const pageSize = 15

function uniqueItems(items: readonly AdminFinanceSupportItem[]) {
  // Support cases can receive a new updated timestamp between pages.
  return [
    ...new Map(
      items.map((item) => [`${item.queueKey}:${item.id}`, item])
    ).values(),
  ]
}

export function financeDeskItemKey(entityId: string | null) {
  return appQueryKey(
    feature,
    getMobilePersistenceScope()?.key,
    "item",
    entityId
  )
}

export function useAdminFinanceDesk(enabled: boolean, offline: boolean) {
  const scope = getMobilePersistenceScope()?.key
  const queryClient = useQueryClient()
  const [lane, setLane] = useState<FinanceDeskLane>("all")
  const [search, setSearch] = useState("")
  const term = useDebounce(search.trim().slice(0, 120), 320)
  const allKey = appQueryKey(feature, scope, "all", "")
  const all = useAppInfiniteQuery({
    enabled,
    initialPageParam: null as FinanceDeskCursor | null,
    queryKey: allKey,
    queryFn: ({ pageParam }) =>
      getAdminFinanceDesk({ limit: pageSize, cursor: pageParam ?? undefined }),
    networkMode: "always",
    staleTime: 0,
    getNextPageParam: (page) => page.nextCursor,
    selectItems: (page) => page.items,
  })
  const code = readErrorCode(all.error)
  const accessLost = code === "FORBIDDEN" || code === "UNAUTHORIZED"
  const first = accessLost ? undefined : all.data?.pages[0]
  const allItems = accessLost ? [] : uniqueItems(all.items)
  const summary = first?.summary
  const laneCounts = summary?.queueCounts
  const hasEveryMatch = (key: FinanceDeskLane) => {
    if (!first || !summary) return false
    if (key === "all") return !all.hasNextPage
    return (
      (laneCounts?.find((entry) => entry.key === key)?.count ?? 0) <=
      allItems.filter((item) => item.queueKey === key).length
    )
  }
  const useFilteredRead =
    Boolean(first) &&
    !offline &&
    (lane !== "all" || Boolean(term)) &&
    !hasEveryMatch(lane)
  const filteredKey = appQueryKey(feature, scope, lane, term, "filtered")
  const filtered = useAppInfiniteQuery({
    enabled: enabled && useFilteredRead,
    initialPageParam: null as FinanceDeskCursor | null,
    // A different lane's rows must never render as this lane's placeholder.
    placeholderData: undefined,
    queryKey: filteredKey,
    queryFn: ({ pageParam }) =>
      getAdminFinanceDesk({
        cursor: pageParam ?? undefined,
        limit: pageSize,
        queueKey: lane === "all" ? undefined : lane,
        search: term || undefined,
      }),
    getNextPageParam: (page) => page.nextCursor,
    selectItems: (page) => page.items,
  })

  const stale =
    isMobileReadCacheStale(first?.cache) ||
    (useFilteredRead && isMobileReadCacheStale(filtered.data?.pages[0]?.cache))
  const active = useFilteredRead ? filtered : all
  const laneItems = (key: FinanceDeskLane) => {
    if (accessLost) return []
    if (key === lane && useFilteredRead && filtered.data)
      return uniqueItems(filtered.items)
    return allItems.filter(
      (item) =>
        (key === "all" || key === item.queueKey) &&
        matchesFinanceDeskSearch(item, term)
    )
  }

  const refresh = () => {
    void all.refetch({ cancelRefetch: false })
    if (useFilteredRead) void filtered.refetch({ cancelRefetch: false })
  }

  const invalidate = useCallback(() => {
    const queries = queryClient.getQueryCache().findAll({
      queryKey: appQueryKey(feature, scope),
    })
    return Promise.all(
      queries.map(({ queryKey }) =>
        queryClient.invalidateQueries({
          queryKey,
          exact: true,
        })
      )
    )
  }, [queryClient, scope])

  return {
    allItems,
    error: all.isError || stale,
    hasData: Boolean(first),
    invalidate,
    isFetchingNextPage: active.isFetchingNextPage,
    isLoading: all.isPending,
    lane,
    laneError: useFilteredRead && filtered.isError,
    laneLoading: useFilteredRead && filtered.isPending,
    laneItems,
    nextPage: () => {
      if (
        !offline &&
        !active.isFetching &&
        (useFilteredRead || (lane === "all" && !term))
      ) {
        active.onEndReached()
      }
    },
    refresh,
    refreshing: all.isRefetching || (useFilteredRead && filtered.isRefetching),
    search,
    searchTerm: term,
    setLane,
    setSearch,
    stale,
    summary,
    updatedAt: first?.cache?.cachedAt ?? first?.generatedAt,
  }
}
