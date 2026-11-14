"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { useBusinessPageParams } from "@/hooks/use-business-page-params"
import { getBusinessesListInput } from "@/lib/business"
import { useTRPC } from "@/trpc/client"

/** Businesses, newest first, 25 at a time ("Show more" loads the next). */
export function useBusinessListQuery() {
  const trpc = useTRPC()
  const { q, status } = useBusinessPageParams()
  const deferredSearch = useDeferredValue(q)
  const queryInput = useMemo(
    () => getBusinessesListInput({ q: deferredSearch, status }),
    [deferredSearch, status]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.business.list.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )
  const rows = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages]
  )

  return {
    fetchNextPage,
    hasFilters: Boolean(q || status),
    hasNextPage,
    isFetchingNextPage,
    rows,
  }
}

export type BusinessListRow = ReturnType<
  typeof useBusinessListQuery
>["rows"][number]
