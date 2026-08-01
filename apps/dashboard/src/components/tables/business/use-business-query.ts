"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { useBusinessFilterParams } from "@/hooks/use-business-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { getBusinessesListInput } from "@/lib/business"
import { useTRPC } from "@/trpc/client"

export function useBusinessQuery() {
  const trpc = useTRPC()
  const { filter, hasFilters } = useBusinessFilterParams()
  const { params } = useSortParams()
  const deferredSearch = useDeferredValue(filter.q)
  const queryInput = useMemo(
    () => getBusinessesListInput(filter, params.sort, deferredSearch),
    [deferredSearch, filter, params.sort]
  )
  const infiniteQueryOptions = trpc.business.list.infiniteQueryOptions(
    queryInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions)
  const businesses = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages]
  )

  return {
    businesses,
    fetchNextPage,
    hasActiveControls: hasFilters || Boolean(params.sort),
    hasNextPage,
    isFetchingNextPage,
  }
}
