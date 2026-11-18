import { appQueryKey, useAppInfiniteQuery } from "@/hooks/use-app-query"
import {
  getMemberActivityPage,
  type MemberCoreCachedActivityPage,
} from "../api/member-core-api"
import type {
  MobileMemberActivityKind,
  MobileMemberActivityRow,
  MobileStatementActivityCategory,
} from "../model/member-core-types"

export function useMemberActivity(input: {
  category?: MobileStatementActivityCategory
  enabled: boolean
  kind: MobileMemberActivityKind
  membershipId?: string
  tenantId?: string
  userId?: string
}) {
  const query = useAppInfiniteQuery({
    enabled: input.enabled,
    getNextPageParam: (page: MemberCoreCachedActivityPage) =>
      page.cache.status === "live" ? (page.nextCursor ?? undefined) : undefined,
    initialPageParam: null as string | null,
    networkMode: "always",
    // A previous key can belong to a different member or category.
    placeholderData: undefined,
    queryFn: ({ pageParam }) =>
      getMemberActivityPage({
        category: input.category,
        cursor: pageParam,
        kind: input.kind,
      }),
    queryKey: appQueryKey(
      "member-core",
      "activity",
      input.tenantId,
      input.userId,
      input.membershipId,
      input.kind,
      input.category
    ),
    selectItems: (
      page: MemberCoreCachedActivityPage
    ): MobileMemberActivityRow[] => page.items,
  })
  const firstPage = query.data?.pages[0]
  const unavailable = firstPage?.state === "database_unavailable"

  return {
    cache: firstPage?.cache,
    error:
      (query.isError &&
        (input.kind === "shares" || !query.isFetchNextPageError)) ||
      unavailable
        ? "Member activity is unavailable."
        : null,
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: input.enabled && query.isPending,
    isRefreshing: query.isRefetching,
    onLoadMore: () => {
      if (!query.isFetching) query.onEndReached()
    },
    onRefresh: () => {
      if (input.enabled) void query.refetch()
    },
    pageError: query.isFetchNextPageError,
    retryPage: () => {
      if (query.hasNextPage && !query.isFetching) void query.fetchNextPage()
    },
    rows: query.items,
  }
}

export type MemberActivityRead = ReturnType<typeof useMemberActivity>
