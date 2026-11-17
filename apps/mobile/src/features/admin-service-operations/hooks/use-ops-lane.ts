import { useAppInfiniteQuery } from "@/hooks/use-app-query"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import type { QueryKey } from "@tanstack/react-query"
import type { OpsLaneState, OpsRow } from "../model/service-ops-types"

type Page = {
  cache?: { ageMs: number; cachedAt: string; scope: string; status: "live" | "stale" }
  generatedAt?: string
  nextCursor?: string | null
}

/**
 * One lane's paged read for the shared service-operations layout. A lane is
 * fetched once it is first shown (`enabled`) and stays cached per term, so
 * switching lanes or returning to the screen never blanks it.
 */
export function useOpsLane<TPage extends Page, TItem>({
  enabled,
  fetchPage,
  offline,
  queryKey,
  selectItems,
  toRow,
}: {
  enabled: boolean
  fetchPage: (cursor: string | null) => Promise<TPage>
  offline: boolean
  queryKey: QueryKey
  selectItems: (page: TPage) => readonly TItem[]
  toRow: (item: TItem) => OpsRow
}) {
  const query = useAppInfiniteQuery({
    enabled,
    getNextPageParam: (page: TPage) => page.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    queryKey,
    selectItems,
  })
  const first = query.data?.pages[0]
  const seen = new Set<string>()
  const raw = query.items.filter((item) => {
    const id = toRow(item).id
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  const state: OpsLaneState = {
    error: query.isError,
    fetchingNext: query.isFetchingNextPage,
    hasData: Boolean(first),
    hasNext: Boolean(query.hasNextPage),
    items: raw.map(toRow),
    loading: enabled && query.isPending,
    nextPage: () => {
      if (!offline && !query.isFetching) query.onEndReached()
    },
    refetch: () => void query.refetch({ cancelRefetch: false }),
    refreshing: query.isRefetching && !query.isFetchingNextPage,
    updating: query.isPlaceholderData,
  }
  return {
    first,
    raw,
    stale: isMobileReadCacheStale(first?.cache),
    state,
  }
}
