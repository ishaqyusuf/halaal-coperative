import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { appQueryKey, useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useLocalSearchParams } from "expo-router"
import { useCallback, useState } from "react"
import { getMemberCoreHome } from "../api/member-core-api"
import {
  applyMemberHomeQaState,
  parseMemberHomeQaState,
} from "../model/member-home-qa"
import { MemberHomeScreen } from "../screens/member-home-screen"

/**
 * Member home (T04): one read (`mobile.member.home`) through the shared
 * query layer — focus, foreground and reconnect refresh, retry policy and
 * the last data kept while it refreshes — plus pull-to-refresh.
 */
export function MemberHomeRouteController() {
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const { qaState } = useLocalSearchParams<{ qaState?: string }>()
  const qa = __DEV__ ? parseMemberHomeQaState(qaState) : null
  const canUseServerHome = canUseMobileFeatureData(profile, "member")
  const homeQuery = useAppQuery({
    enabled: canUseServerHome,
    // The read cache answers offline from the last saved copy.
    networkMode: "always",
    queryFn: getMemberCoreHome,
    queryKey: appQueryKey(
      "member-core",
      "home",
      profile?.tenant.id,
      profile?.user.id,
      profile?.activeMembershipId
    ),
  })
  const { refetch } = homeQuery
  const [pulling, setPulling] = useState(false)
  const refresh = useCallback(async () => {
    setPulling(true)
    try {
      await refetch()
    } finally {
      setPulling(false)
    }
  }, [refetch])

  if (!profile) return null

  const live = {
    home: homeQuery.data ?? null,
    isError: canUseServerHome && homeQuery.isError,
    isOffline: runtime.state.connectivity === "offline",
    isPending: canUseServerHome && homeQuery.isPending,
  }
  // Development builds only: device QA of every state (see member-home-qa).
  const view = qa ? applyMemberHomeQaState(qa, live) : live

  return (
    <MemberHomeScreen
      home={view.home}
      isError={view.isError}
      isOffline={view.isOffline}
      isPending={view.isPending}
      onRefresh={() => void refresh()}
      onRetry={() => void refresh()}
      profile={profile}
      refreshing={pulling}
      retrying={homeQuery.isFetching}
    />
  )
}
