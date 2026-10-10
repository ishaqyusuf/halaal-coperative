"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { useProjectFinancingFilterParams } from "@/hooks/use-project-financing-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { getProjectFinancingListInput } from "@/lib/project-financing/project-financing-list-input"
import { useTRPC } from "@/trpc/client"

export function useProjectFinancingQuery() {
  const trpc = useTRPC()
  const { filter } = useProjectFinancingFilterParams()
  const { params } = useSortParams()
  const deferredSearch = useDeferredValue(filter.q)
  const queryInput = useMemo(
    () => getProjectFinancingListInput(filter, params.sort, deferredSearch),
    [deferredSearch, filter, params.sort]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.projectFinancing.list.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )

  return {
    fetchNextPage,
    hasFilters: Boolean(filter.q || filter.status || params.sort),
    hasNextPage,
    isFetchingNextPage,
    requests: data.pages.flatMap((page) => page.data),
  }
}
