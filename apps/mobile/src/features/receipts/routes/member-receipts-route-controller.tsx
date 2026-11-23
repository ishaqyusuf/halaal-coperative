import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useAuthContext } from "@/hooks/use-auth"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useEffect } from "react"
import { useSharedReceipt } from "../platform/shared-receipt-provider"
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
  const { compose, notificationEntityId, payable, sharedReceipt } = useLocalSearchParams<{
    compose?: string | string[]
    notificationEntityId?: string | string[]
    payable?: string | string[]
    sharedReceipt?: string | string[]
  }>()
  const clearCompose = useCallback(
    () => router.setParams({ compose: undefined, payable: undefined }),
    [router]
  )

  const handoff = useSharedReceipt(first(sharedReceipt))
  const receipt = handoff?.receipt ?? undefined
  const clearReceipt = handoff?.clear
  const id = receipt?.id

  useEffect(() => {
    return () => {
      if (id) clearReceipt?.(id)
    }
  }, [clearReceipt, id])

  function dismissSharedReceipt(paymentId?: string) {
    if (id) clearReceipt?.(id)
    if (paymentId) {
      router.setParams({
        notificationEntityId: paymentId,
        sharedReceipt: undefined,
      })
    } else if (router.canGoBack()) {
      router.back()
    } else {
      router.replace("/(member)/(tabs)")
    }
  }

  return (
    <ReceiptsScreen
      composePayable={first(payable) ?? null}
      composeRequested={!receipt && first(compose) === "1"}
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
      key={
        profile
          ? `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}:${id ?? ""}`
          : undefined
      }
      onComposeHandled={clearCompose}
      onSharedReceiptClosed={receipt ? dismissSharedReceipt : undefined}
      sharedReceipt={receipt}
    />
  )
}
