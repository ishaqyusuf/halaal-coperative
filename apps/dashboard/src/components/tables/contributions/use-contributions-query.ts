"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { useContributionsFilterParams } from "@/hooks/use-contributions-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { getContributionListInput } from "@/lib/contributions/contribution-list-input"
import { useTRPC } from "@/trpc/client"

export function useContributionsQuery() {
  const trpc = useTRPC()
  const { filters } = useContributionsFilterParams()
  const { params } = useSortParams()
  const deferredSearch = useDeferredValue(filters.search)
  const queryInput = useMemo(
    () => getContributionListInput(filters, params.sort, deferredSearch),
    [deferredSearch, filters, params.sort]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.contributions.ledger.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )

  return {
    fetchNextPage,
    hasFilters: Boolean(
      filters.channel ||
        filters.dateRange?.length ||
        filters.memberId ||
        filters.search
    ),
    hasNextPage,
    isFetchingNextPage,
    rows: data.pages.flatMap((page) => page.data),
  }
}
