import { useAuthContext } from "@/hooks/use-auth"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { appQueryKey, useAppQuery } from "@/hooks/use-app-query"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { getMemberCommitments } from "../api/member-core-api"
import { MemberCommitmentsScreen } from "../screens/member-commitments-screen"
import { useMemberActivity } from "../public/use-member-activity"

export function MemberCommitmentsRouteController() {
  const { profile } = useAuthContext()
  const { state } = useMobileRuntime()
  const canUseServerData = canUseMobileFeatureData(profile, "member")
  const commitmentsQuery = useAppQuery({
    enabled: canUseServerData,
    networkMode: "always",
    queryFn: getMemberCommitments,
    placeholderData: undefined,
    queryKey: appQueryKey(
      "member-core",
      "commitments",
      profile?.tenant.id,
      profile?.user.id,
      profile?.activeMembershipId
    ),
  })
  const activity = useMemberActivity({
    enabled: canUseServerData,
    kind: "commitments",
    membershipId: profile?.activeMembershipId,
    tenantId: profile?.tenant.id,
    userId: profile?.user.id,
  })

  if (!profile) return null

  return (
    <MemberCommitmentsScreen
      activity={activity}
      currencyCode={profile.tenant.currencyCode}
      error={commitmentsQuery.isError}
      isLoading={canUseServerData && commitmentsQuery.isPending}
      key={`${profile.tenant.id}:${profile.activeMembershipId}:${profile.user.id}`}
      offline={state.connectivity === "offline"}
      onRefresh={() => {
        if (!canUseServerData) return
        void commitmentsQuery.refetch()
        activity.onRefresh()
      }}
      refreshing={commitmentsQuery.isRefetching || activity.isRefreshing}
      section={commitmentsQuery.data}
    />
  )
}
