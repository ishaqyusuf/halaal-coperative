"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { usePaymentReceiptFilterParams } from "@/hooks/use-payment-receipt-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { getPaymentReceiptListInput } from "@/lib/payment-receipts/payment-receipt-list-input"
import { useTRPC } from "@/trpc/client"

export function usePaymentReceiptsQuery() {
  const trpc = useTRPC()
  const { filter } = usePaymentReceiptFilterParams()
  const { params } = useSortParams()
  const deferredSearch = useDeferredValue(filter.q)
  const queryInput = useMemo(
    () => getPaymentReceiptListInput(filter, params.sort, deferredSearch),
    [deferredSearch, filter, params.sort]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.paymentReceipts.list.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )

  return {
    fetchNextPage,
    hasActiveControls: Boolean(filter.q || filter.status || params.sort),
    hasNextPage,
    isFetchingNextPage,
    receipts: data.pages.flatMap((page) => page.data),
  }
}
