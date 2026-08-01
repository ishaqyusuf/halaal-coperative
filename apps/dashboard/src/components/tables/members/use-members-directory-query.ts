"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { useMembersFilterParams } from "@/hooks/use-members-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { getMembersListInput } from "@/lib/members/member-list-input"
import { useTRPC } from "@/trpc/client"

export function useMembersDirectoryQuery() {
  const trpc = useTRPC()
  const { filters } = useMembersFilterParams()
  const { params } = useSortParams()
  const deferredSearch = useDeferredValue(filters.q)
  const queryInput = useMemo(
    () => getMembersListInput(filters, params.sort, deferredSearch),
    [deferredSearch, filters, params.sort]
  )
  const infiniteQueryOptions = trpc.members.list.infiniteQueryOptions(
    queryInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions)
  const members = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages]
  )
  const hasDirectoryControls = Object.values(filters).some(
    (value) => value !== null && value !== ""
  )

  return {
    fetchNextPage,
    hasDirectoryControls,
    hasNextPage,
    isFetchingNextPage,
    members,
  }
}
