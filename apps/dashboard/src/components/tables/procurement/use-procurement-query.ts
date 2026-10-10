"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { useProcurementFilterParams } from "@/hooks/use-procurement-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { getProcurementListInput } from "@/lib/procurement/procurement-list-input"
import { useTRPC } from "@/trpc/client"

export function useProcurementQuery() {
  const trpc = useTRPC()
  const { filter } = useProcurementFilterParams()
  const { params } = useSortParams()
  const deferredSearch = useDeferredValue(filter.q)
  const queryInput = useMemo(
    () => getProcurementListInput(filter, params.sort, deferredSearch),
    [deferredSearch, filter, params.sort]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.procurement.list.infiniteQueryOptions(queryInput, {
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
