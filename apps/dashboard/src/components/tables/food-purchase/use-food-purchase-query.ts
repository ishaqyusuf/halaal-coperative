"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { useFoodPurchaseFilterParams } from "@/hooks/use-food-purchase-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { getFoodPurchaseListInput } from "@/lib/food-purchase/food-purchase-list-input"
import { useTRPC } from "@/trpc/client"

export function useFoodPurchaseQuery() {
  const trpc = useTRPC()
  const { filter } = useFoodPurchaseFilterParams()
  const { params } = useSortParams()
  const queryInput = useMemo(
    () => getFoodPurchaseListInput(filter, params.sort),
    [filter, params.sort]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.foodPurchase.list.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )

  return {
    applications: data.pages.flatMap((page) => page.data),
    fetchNextPage,
    hasActiveControls: Boolean(filter.q || filter.status || params.sort),
    hasNextPage,
    isFetchingNextPage,
  }
}
