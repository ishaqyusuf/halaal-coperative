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

  // Flatten once per data change so the table's row model stays stable.
  const requests = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages]
  )

  return {
    fetchNextPage,
    hasFilters: Boolean(filter.q || filter.status || params.sort),
    hasNextPage,
    isFetchingNextPage,
    requests,
  }
}
