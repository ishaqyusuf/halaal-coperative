"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { useMembershipApprovalsFilterParams } from "@/hooks/use-membership-approvals-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { getMembershipApprovalsListInput } from "@/lib/membership-approvals/list-input"
import { useTRPC } from "@/trpc/client"

export function useMembershipApprovalsQuery() {
  const trpc = useTRPC()
  const { filter, hasFilters } = useMembershipApprovalsFilterParams()
  const { params } = useSortParams()
  const deferredSearch = useDeferredValue(filter.search)
  const queryInput = useMemo(
    () => getMembershipApprovalsListInput(filter, params.sort, deferredSearch),
    [deferredSearch, filter, params.sort]
  )
  const infiniteQueryOptions =
    trpc.onboarding.membershipApprovals.infiniteQueryOptions(queryInput, {
      getNextPageParam: ({ meta }) => meta?.cursor,
    })
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions)
  const requests = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages]
  )

  return {
    fetchNextPage,
    hasActiveControls: hasFilters || Boolean(params.sort),
    hasNextPage,
    isFetchingNextPage,
    requests,
  }
}
