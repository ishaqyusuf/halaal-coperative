import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { appQueryKey, useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useLocalSearchParams } from "expo-router"
import { useCallback, useState } from "react"
import { getAdminLifecycleOverview } from "../api/admin-member-lifecycle-api"
import { applyAdminOverviewQaState } from "../model/admin-member-lifecycle-qa"
import { AdminOverviewScreen } from "../screens/admin-overview-screen"
import { getAdminLifecycleQaState } from "./admin-lifecycle-qa-state"

/**
 * Admin overview (T05): one read (`mobile.admin.overview`) through the
 * shared query layer — focus, foreground and reconnect refresh, the retry
 * policy and the last data kept while it refreshes — plus pull-to-refresh.
 */
export function AdminOverviewRouteController() {
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const { qaState: qaParam } = useLocalSearchParams<{
    qaState?: string | string[]
  }>()
  const qaState = getAdminLifecycleQaState(qaParam)
  const canUseOverview =
    qaState !== "denied" && canUseMobileFeatureData(profile, "admin")
  const overviewQuery = useAppQuery({
    enabled: canUseOverview,
    // The read cache answers offline from the last saved copy.
    networkMode: "always",
    queryFn: getAdminLifecycleOverview,
    queryKey: appQueryKey(
      "admin-member-lifecycle",
      "overview",
      profile?.tenant.id,
      profile?.user.id,
      profile?.activeMembershipId
    ),
  })
  const { refetch } = overviewQuery
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
    isError: canUseOverview && overviewQuery.isError,
    isOffline: runtime.state.connectivity === "offline",
    isPending: canUseOverview && overviewQuery.isPending,
    overview: overviewQuery.data ?? null,
  }
  // Development builds only (getAdminLifecycleQaState checks __DEV__).
  const view = applyAdminOverviewQaState(qaState, live)

  return (
    <AdminOverviewScreen
      canUseOverview={canUseOverview}
      isError={view.isError}
      isOffline={view.isOffline}
      isPending={view.isPending}
      onRefresh={() => void refresh()}
      onRetry={() => void refresh()}
      overview={view.overview}
      profile={profile}
      refreshing={pulling}
      retrying={overviewQuery.isFetching}
    />
  )
}
