"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { useMonthlyRecordFilterParams } from "@/hooks/use-monthly-record-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { useTRPC } from "@/trpc/client"
import { getMonthlyRecordRowsInput } from "./rows-input"

// One query owner for the desktop table and the phone list. The page hydrates
// the first page; mutations invalidate it, so there is no polling.
export function useMonthlyRecordsQuery(monthlyRecordId?: string | null) {
  const trpc = useTRPC()
  const { params } = useSortParams()
  const { filter, hasFilters } = useMonthlyRecordFilterParams()
  const deferredSearch = useDeferredValue(filter.q)
  const queryInput = useMemo(
    () =>
      getMonthlyRecordRowsInput({
        monthlyRecordId,
        q: deferredSearch,
        sort: params.sort,
        status: filter.status,
        workplaceId: filter.workplaceId,
      }),
    [
      deferredSearch,
      filter.status,
      filter.workplaceId,
      monthlyRecordId,
      params.sort,
    ]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.monthlyRecords.rows.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )
  const rows = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages]
  )

  return {
    fetchNextPage,
    hasFilters,
    hasNextPage,
    isFetchingNextPage,
    rows,
    total: data.pages[0]?.meta.total ?? rows.length,
  }
}
