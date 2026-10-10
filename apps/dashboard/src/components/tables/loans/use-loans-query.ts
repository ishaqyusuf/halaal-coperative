"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { useLoanFilterParams } from "@/hooks/use-loan-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import {
  getLoanPortfolioListInput,
  getLoanRequestListInput,
} from "@/lib/loans/loan-list-input"
import { useTRPC } from "@/trpc/client"

export function useLoanRequestsQuery(memberId?: string) {
  const trpc = useTRPC()
  const { filter } = useLoanFilterParams()
  const { params } = useSortParams()
  const queryInput = getLoanRequestListInput(filter, params.sort, memberId)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.loans.requests.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )
  const requests = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages]
  )

  return {
    fetchNextPage,
    hasActiveControls: Boolean(filter.q || filter.requestStatus || params.sort),
    hasNextPage,
    isFetchingNextPage,
    requests,
  }
}

export function useLoanPortfolioQuery(memberId?: string) {
  const trpc = useTRPC()
  const { filter } = useLoanFilterParams()
  const { params } = useSortParams()
  const queryInput = getLoanPortfolioListInput(filter, params.sort, memberId)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.loans.portfolio.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )
  const loans = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages]
  )

  return {
    fetchNextPage,
    hasActiveControls: Boolean(
      filter.q || filter.portfolioStatus || params.sort
    ),
    hasNextPage,
    isFetchingNextPage,
    loans,
  }
}
