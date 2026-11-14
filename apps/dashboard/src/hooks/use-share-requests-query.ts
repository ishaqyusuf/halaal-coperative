"use client"

import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { useShareRequestsParams } from "@/hooks/use-share-requests-params"
import { getShareRequestListInput } from "@/lib/shares/share-request-list-input"
import { useTRPC } from "@/trpc/client"

/** Staff list of share requests, 50 at a time, rows memoized per page set. */
export function useShareRequestsQuery() {
  const trpc = useTRPC()
  const { shareRequests } = useShareRequestsParams()
  const queryInput = useMemo(
    () => getShareRequestListInput(shareRequests),
    [shareRequests]
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.shareApplications.list.infiniteQueryOptions(queryInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      })
    )
  const requests = useMemo(
    () => data.pages.flatMap((page) => page.data),
    [data.pages]
  )

  return { fetchNextPage, hasNextPage, isFetchingNextPage, requests }
}
