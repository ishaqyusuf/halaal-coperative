"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { useShareApplicationFilterParams } from "@/hooks/use-share-application-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { getShareApplicationListInput } from "@/lib/shares/share-application-list-input"
import { useTRPC } from "@/trpc/client"

export function useShareApplicationsQuery() {
  const trpc = useTRPC()
  const { filter } = useShareApplicationFilterParams()
  const { params } = useSortParams()
  const queryInput = useMemo(
    () =>
      getShareApplicationListInput({
        filter,
        sort: params.sort,
      }),
    [filter, params.sort]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.shareApplications.list.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )

  return {
    applications: data.pages.flatMap((page) => page.data),
    fetchNextPage,
    hasActiveControls: Boolean(
      filter.shareApplicationQ || filter.shareApplicationStatus || params.sort
    ),
    hasNextPage,
    isFetchingNextPage,
  }
}
