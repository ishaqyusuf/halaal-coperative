import {
  getMemberActivityPage,
  type MemberCoreCachedActivityPage,
} from "../api/member-core-api"
import type {
  MemberActivityHistoryState,
  MobileMemberActivityKind,
} from "../model/member-core-types"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"

export function useMemberActivity(input: {
  enabled: boolean
  kind: MobileMemberActivityKind
  membershipId?: string
  tenantId?: string
  userId?: string
}): MemberActivityHistoryState {
  const query = useInfiniteQuery({
    enabled: input.enabled,
    getNextPageParam: (lastPage: MemberCoreCachedActivityPage) =>
      lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    networkMode: "always",
    queryFn: ({ pageParam }) =>
      getMemberActivityPage({ cursor: pageParam, kind: input.kind }),
    queryKey: [
      "mobile",
      "member-core",
      "activity",
      input.kind,
      input.tenantId,
      input.userId,
      input.membershipId,
    ],
    retry: false,
  })
  const rows = useMemo(
    () =>
      query.data?.pages.flatMap(
        (page: MemberCoreCachedActivityPage) => page.items
      ) ?? [],
    [query.data?.pages]
  )
  const { fetchNextPage } = query

  return {
    error: query.isError ? "Member activity is unavailable." : null,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: input.enabled && query.isPending,
    onLoadMore: () => {
      if (!query.hasNextPage || query.isFetchingNextPage) return
      void fetchNextPage()
    },
    rows,
  }
}
