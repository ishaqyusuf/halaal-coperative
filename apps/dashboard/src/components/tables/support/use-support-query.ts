"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { useSortParams } from "@/hooks/use-sort-params"
import { useSupportFilterParams } from "@/hooks/use-support-filter-params"
import { getSupportListInput } from "@/lib/support/support-list-input"
import { useTRPC } from "@/trpc/client"

export function useSupportQuery(mode: "member" | "staff") {
  const trpc = useTRPC()
  const { filter } = useSupportFilterParams()
  const { params } = useSortParams()
  const deferredSearch = useDeferredValue(filter.q)
  const queryInput = useMemo(
    () =>
      getSupportListInput(
        filter,
        params.sort,
        deferredSearch,
        mode === "staff"
      ),
    [deferredSearch, filter, mode, params.sort]
  )
  const infiniteQueryOptions = trpc.support.list.infiniteQueryOptions(
    queryInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions)
  const supportCases = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages]
  )
  const hasActiveFilters = Boolean(
    filter.q ||
      filter.priority ||
      filter.status ||
      (mode === "staff" &&
        (filter.category || filter.assignedToUserId))
  )

  return {
    fetchNextPage,
    hasActiveControls: hasActiveFilters || Boolean(params.sort),
    hasNextPage,
    isFetchingNextPage,
    supportCases,
  }
}
