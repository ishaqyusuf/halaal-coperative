import { useAuthContext } from "@/hooks/use-auth"
import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useCallback } from "react"
import { ReceiptsScreen } from "../screens/member-receipts-screen"

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

/**
 * Transactions (route `receipts`). Reads the pay-from-request deep link
 * (`compose=1`, `payable=<kind>:<id>`, T30 contract) and clears it once
 * Record payment has opened so a back/forward doesn't reopen it.
 */
export function MemberReceiptsRouteController() {
  const { profile } = useAuthContext()
  const router = useRouter()
  const { compose, notificationEntityId, payable } = useLocalSearchParams<{
    compose?: string | string[]
    notificationEntityId?: string | string[]
    payable?: string | string[]
  }>()
  const clearCompose = useCallback(
    () => router.setParams({ compose: undefined, payable: undefined }),
    [router]
  )

  return (
    <ReceiptsScreen
      composePayable={first(payable) ?? null}
      composeRequested={first(compose) === "1"}
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
      key={
        profile
          ? `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}`
          : undefined
      }
      onComposeHandled={clearCompose}
    />
  )
}
