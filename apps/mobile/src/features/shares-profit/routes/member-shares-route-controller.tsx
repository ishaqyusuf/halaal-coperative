import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import {
  appQueryKey,
  useAppInfiniteQuery,
  useAppQuery,
  useInvalidateAppQueries,
} from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import {
  createMemberShareApplication,
  getMemberShareOverview,
  getMemberShareProfitPeriods,
  getMemberShareTimelinePage,
} from "../api/member-shares-api"
import type {
  MobileMemberShareApplicationCreateInput,
  ShareTimelineItem,
} from "../model/member-shares-types"
import { SharesScreen } from "../screens/member-shares-screen"

type Overview = Awaited<ReturnType<typeof getMemberShareOverview>>
type SharesPage =
  | { overview: Overview; timeline: Overview["timeline"] }
  | {
      overview?: undefined
      timeline: Awaited<ReturnType<typeof getMemberShareTimelinePage>>
    }

export function MemberSharesRouteController() {
  const { profile } = useAuthContext()
  const { runOnlineOperation, state } = useMobileRuntime()
  const scope = [
    profile?.tenant.id,
    profile?.user.id,
    profile?.activeMembershipId,
  ]
  const scopeKey = scope.join(":")
  const overviewKey = appQueryKey("shares-profit", "overview", ...scope)
  const profitKey = appQueryKey("shares-profit", "profit", ...scope)
  const enabled = canUseMobileFeatureData(profile, "member")
  const offline = state.connectivity === "offline"
  const invalidate = useInvalidateAppQueries()
  const [profitScope, setProfitScope] = useState<string | null>(null)

  const sharesQuery = useAppInfiniteQuery({
    enabled,
    getNextPageParam: (page: SharesPage) =>
      page.overview?.cache.status === "stale"
        ? undefined
        : (page.timeline.nextCursor ?? undefined),
    initialPageParam: null as string | null,
    networkMode: "always",
    placeholderData: undefined,
    queryFn: async ({ pageParam }): Promise<SharesPage> => {
      if (pageParam)
        return { timeline: await getMemberShareTimelinePage(pageParam) }
      const overview = await getMemberShareOverview()
      return { overview, timeline: overview.timeline }
    },
    queryKey: overviewKey,
    selectItems: (page: SharesPage): ShareTimelineItem[] => page.timeline.items,
  })

  const profit = useAppQuery({
    enabled: enabled && profitScope === scopeKey,
    placeholderData: undefined,
    queryFn: getMemberShareProfitPeriods,
    queryKey: profitKey,
  })
  const submission = useMutation({
    mutationFn: (input: MobileMemberShareApplicationCreateInput) =>
      runOnlineOperation("financial-command", () =>
        createMemberShareApplication(input)
      ),
    networkMode: "always",
    retry: false,
    onSuccess: () => {
      void invalidate(overviewKey)
    },
  })

  if (!profile) return null

  const overview = sharesQuery.data?.pages[0]?.overview ?? null
  const cache = overview?.cache
  return (
    <SharesScreen
      key={scopeKey}
      cachedAt={cache?.cachedAt}
      currencyCode={profile.tenant.currencyCode}
      loading={enabled && sharesQuery.isPending}
      loadError={sharesQuery.isError && !sharesQuery.isFetchNextPageError}
      memberNumber={profile.member?.code}
      offline={offline}
      stale={cache?.status === "stale"}
      overview={overview}
      refresh={() => {
        if (enabled) void sharesQuery.refetch()
      }}
      refreshing={sharesQuery.isRefetching}
      timeline={sharesQuery.items}
      loadMore={() => {
        if (!offline && !sharesQuery.isFetching) sharesQuery.onEndReached()
      }}
      loadingMore={sharesQuery.isFetchingNextPage}
      pageError={sharesQuery.isFetchNextPageError}
      retryPage={() => {
        if (!offline && !sharesQuery.isFetching)
          void sharesQuery.fetchNextPage()
      }}
      profit={{
        loading: profit.isPending && !offline,
        onOpen: () => setProfitScope(scopeKey),
        onClose: () => setProfitScope(null),
        onRetry: () => void profit.refetch(),
        periods: profit.data,
      }}
      persistDraft={enabled}
      submit={submission.mutateAsync}
    />
  )
}
