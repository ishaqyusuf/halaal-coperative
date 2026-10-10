"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { useRepaymentsFilterParams } from "@/hooks/use-repayments-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import {
  getRepaymentHistoryListInput,
  getRepaymentScheduleListInput,
} from "@/lib/repayments/repayments-list-input"
import type {
  RepaymentHistoryRow,
  RepaymentScheduleRow,
} from "./types"
import { useTRPC } from "@/trpc/client"

export function useRepaymentScheduleQuery(view: "collections" | "schedule") {
  const trpc = useTRPC()
  const { filters } = useRepaymentsFilterParams()
  const { params } = useSortParams()
  const deferredSearch = useDeferredValue(filters.q)
  const queryInput = useMemo(
    () =>
      getRepaymentScheduleListInput(filters, params.sort, {
        collectionsOnly: view === "collections",
        q: deferredSearch,
      }),
    [deferredSearch, filters, params.sort, view]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.repayments.schedule.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )

  return {
    fetchNextPage,
    hasFilters: Boolean(
      filters.assignedToUserId ||
        filters.dateRange?.length ||
        filters.memberId ||
        filters.q ||
        filters.resolutionStatus ||
        filters.scheduleStatus ||
        filters.stage
    ),
    hasNextPage,
    isFetchingNextPage,
    rows: data.pages.flatMap((page) => page.data),
  }
}

export function useRepaymentHistoryQuery() {
  const trpc = useTRPC()
  const { filters } = useRepaymentsFilterParams()
  const { params } = useSortParams()
  const deferredSearch = useDeferredValue(filters.q)
  const queryInput = useMemo(
    () =>
      getRepaymentHistoryListInput(filters, params.sort, deferredSearch),
    [deferredSearch, filters, params.sort]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.repayments.history.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )

  return {
    fetchNextPage,
    hasFilters: Boolean(
      filters.dateRange?.length ||
      filters.memberId ||
      filters.q ||
      filters.repaymentStatus
    ),
    hasNextPage,
    isFetchingNextPage,
    rows: data.pages.flatMap((page) => page.data),
  }
}
