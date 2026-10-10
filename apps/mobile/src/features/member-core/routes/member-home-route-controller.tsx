import { useAuthContext } from "@/hooks/use-auth"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { MemberHomeScreen } from "../screens/member-home-screen"
import { useQuery } from "@tanstack/react-query"
import { getMemberCoreHome } from "../api/member-core-api"

export function MemberHomeRouteController() {
  const { profile } = useAuthContext()
  const canUseServerHome = canUseMobileFeatureData(profile, "member")
  const homeQuery = useQuery({
    enabled: canUseServerHome,
    networkMode: "always",
    queryFn: getMemberCoreHome,
    queryKey: [
      "mobile",
      "member-core",
      "home",
      profile?.tenant.id,
      profile?.user.id,
      profile?.activeMembershipId,
    ],
    retry: false,
  })

  if (!profile) return null

  return (
    <MemberHomeScreen
      home={homeQuery.data ?? null}
      homeError={homeQuery.isError ? "Member home is unavailable." : null}
      isLoadingHome={canUseServerHome && homeQuery.isPending}
      onRetryHome={
        canUseServerHome && homeQuery.isError
          ? () => void homeQuery.refetch()
          : undefined
      }
      profile={profile}
    />
  )
}
