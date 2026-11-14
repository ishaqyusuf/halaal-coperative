"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { useChargesPageParams } from "@/hooks/use-charges-page-params"
import { getChargeActivityInput } from "@/lib/charges/charge-list-input"
import { useTRPC } from "@/trpc/client"

/** Member charges, newest first, 30 at a time ("Show more" loads the next). */
export function useChargeActivityQuery() {
  const trpc = useTRPC()
  const { chargedQ } = useChargesPageParams()
  const deferredSearch = useDeferredValue(chargedQ)
  const queryInput = useMemo(
    () => getChargeActivityInput(deferredSearch),
    [deferredSearch]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.charges.activity.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )
  const rows = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages]
  )

  return {
    fetchNextPage,
    hasNextPage,
    hasSearch: Boolean(chargedQ),
    isFetchingNextPage,
    rows,
  }
}

export type ChargeActivityRow = ReturnType<
  typeof useChargeActivityQuery
>["rows"][number]
