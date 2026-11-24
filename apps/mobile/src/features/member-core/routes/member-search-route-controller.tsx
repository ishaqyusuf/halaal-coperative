import { appQueryKey } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"
import type { MobileMemberHome } from "../model/member-core-types"
import { buildMemberHomePresentation } from "../model/member-home-presentation"
import { buildMemberSearchDestinations } from "../model/member-search"
import { MemberSearchScreen } from "../screens/member-search-screen"

/**
 * Member search (T31): reads the member home already in the query cache for
 * the services the cooperative turned on. It never fetches.
 */
export function MemberSearchRouteController() {
  const { profile } = useAuthContext()
  const queryClient = useQueryClient()
  const destinations = useMemo(() => {
    const home =
      queryClient.getQueryData<MobileMemberHome>(
        appQueryKey(
          "member-core",
          "home",
          profile?.tenant.id,
          profile?.user.id,
          profile?.activeMembershipId
        )
      ) ?? null
    const services = buildMemberHomePresentation(
      home,
      profile?.tenant.currencyCode ?? "NGN"
    ).services
    return buildMemberSearchDestinations(services)
  }, [profile, queryClient])

  if (!profile) return null
  return <MemberSearchScreen destinations={destinations} />
}
