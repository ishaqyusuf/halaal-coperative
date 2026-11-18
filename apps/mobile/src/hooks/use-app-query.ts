import {
  APP_QUERY_GC_TIME,
  APP_QUERY_STALE_TIME,
  appQueryRetryDelay,
  shouldRetryAppQuery,
} from "@/lib/app-query-policy"
import { useFocusEffect } from "@react-navigation/native"
import {
  type DefaultError,
  type InfiniteData,
  type QueryKey,
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type UseInfiniteQueryOptions,
  type UseQueryOptions,
} from "@tanstack/react-query"
import { useCallback, useRef } from "react"

/**
 * The mobile read defaults (ADR-20261116 §5): refetch when the app returns
 * to the foreground or reconnects (MobileRuntimeProvider.refreshActiveReads
 * drives both through React Query), keep the previous data while a new key
 * loads (no spinner flashes), and never retry auth/validation failures.
 */
export const appQueryDefaults = {
  gcTime: APP_QUERY_GC_TIME,
  placeholderData: keepPreviousData,
  refetchOnReconnect: true,
  refetchOnWindowFocus: true,
  retry: shouldRetryAppQuery,
  retryDelay: appQueryRetryDelay,
  staleTime: APP_QUERY_STALE_TIME,
} as const

/** Query keys are namespaced by feature so invalidation stays exact. */
export function appQueryKey(feature: string, ...parts: unknown[]): QueryKey {
  return ["app", feature, ...parts]
}

/**
 * Refetch stale data when the navigator screen regains focus (returning
 * from a pushed screen or switching tabs), skipping the first focus.
 */
function useRefetchOnScreenFocus(refetch: () => unknown, enabled: boolean) {
  const firstFocus = useRef(true)
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false
        return
      }
      if (enabled) void refetchRef.current()
    }, [enabled])
  )
}

export type AppQueryOptions<
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
  /** Default true: refetch stale data when the screen regains focus. */
  refetchOnScreenFocus?: boolean
}

/**
 * A screen read. Accepts tRPC `queryOptions(...)` or a plain
 * `{ queryKey: appQueryKey(...), queryFn }`.
 */
export function useAppQuery<
  TQueryFnData,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>({
  refetchOnScreenFocus = true,
  ...options
}: AppQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
  const query = useQuery<TQueryFnData, TError, TData, TQueryKey>({
    ...(appQueryDefaults as Partial<
      UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
    >),
    ...options,
  })
  useRefetchOnScreenFocus(
    () => (query.isStale ? query.refetch() : undefined),
    refetchOnScreenFocus && options.enabled !== false
  )
  return query
}

/**
 * A paged screen read for AppList: pass `getNextPageParam` and a bounded
 * page size (clampPageSize). `items` flattens the pages for the list.
 */
export function useAppInfiniteQuery<
  TQueryFnData,
  TItem,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
>({
  refetchOnScreenFocus = true,
  selectItems,
  ...options
}: UseInfiniteQueryOptions<
  TQueryFnData,
  TError,
  InfiniteData<TQueryFnData, TPageParam>,
  TQueryKey,
  TPageParam
> & {
  refetchOnScreenFocus?: boolean
  selectItems: (page: TQueryFnData) => readonly TItem[]
}) {
  const query = useInfiniteQuery({
    ...(appQueryDefaults as object),
    ...options,
  } as UseInfiniteQueryOptions<
    TQueryFnData,
    TError,
    InfiniteData<TQueryFnData, TPageParam>,
    TQueryKey,
    TPageParam
  >)
  useRefetchOnScreenFocus(
    () => (query.isStale ? query.refetch() : undefined),
    refetchOnScreenFocus && options.enabled !== false
  )
  const items = (query.data?.pages ?? []).flatMap((page) => [
    ...selectItems(page),
  ])
  const fetchNextPage = query.fetchNextPage
  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage && !query.isError)
      void fetchNextPage()
  }, [fetchNextPage, query.hasNextPage, query.isError, query.isFetchingNextPage])
  return { ...query, items, onEndReached }
}

/**
 * Write follow-up: invalidate exact keys (and wait) instead of chaining
 * manual reloads. Pass appQueryKey(...) keys or tRPC `pathKey()`s.
 */
export function useInvalidateAppQueries() {
  const queryClient = useQueryClient()
  return useCallback(
    (...queryKeys: QueryKey[]) =>
      Promise.all(
        queryKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey })
        )
      ).then(() => undefined),
    [queryClient]
  )
}
