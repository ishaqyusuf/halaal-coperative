import { useAuthContext } from "@/hooks/use-auth"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useQuery } from "@tanstack/react-query"
import { getMemberCommitments } from "../api/member-core-api"
import { MemberCommitmentsScreen } from "../screens/member-commitments-screen"
import { useMemberActivity } from "../public/use-member-activity"

export function MemberCommitmentsRouteController() {
  const { profile } = useAuthContext()
  const canUseServerData = canUseMobileFeatureData(profile, "member")
  const commitmentsQuery = useQuery({
    enabled: canUseServerData,
    networkMode: "always",
    queryFn: getMemberCommitments,
    queryKey: [
      "mobile",
      "member-core",
      "commitments",
      profile?.tenant.id,
      profile?.user.id,
      profile?.activeMembershipId,
    ],
    retry: false,
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
      canUseServerData={canUseServerData}
      error={commitmentsQuery.isError ? "This section is unavailable." : null}
      isLoading={canUseServerData && commitmentsQuery.isPending}
      profile={profile}
      section={commitmentsQuery.data ?? null}
    />
  )
}
