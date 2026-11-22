import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { appQueryKey, useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useIsOnline } from "@/lib/online-status"
import { getMemberPayables } from "../api/member-receipts-api"

export type {
  MobileMemberPayable,
  MobileMemberPayableKind,
  MobileMemberPayables,
} from "../model/member-receipt-types"

/**
 * The member's current payables (T30), shared with other features: lane D's
 * Pay buttons and the admin payment-order screen invalidate or read it.
 * `account` is `${user.id}:${tenant.id}:${activeMembershipId}`.
 */
export function memberPayablesQueryKey(account: string | undefined) {
  return appQueryKey("member-receipts", account, "payables")
}

/** Prefix that matches every account's payables (for broad invalidation). */
export const memberPayablesQueryPrefix = appQueryKey("member-receipts")

/**
 * Pay-from-request deep link (T30 contract): opens Record payment with the
 * matching badge picked. `payable` is `procurement:<schedule item id>` or
 * `food_purchase:<application id>`.
 */
export function recordPaymentHref(payable: string) {
  return {
    params: { compose: "1", payable },
    pathname: "/(member)/receipts" as const,
  }
}

export function useMemberPayables(options: { enabled?: boolean } = {}) {
  const { profile } = useAuthContext()
  const online = useIsOnline()
  const account = profile
    ? `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}`
    : undefined
  return useAppQuery({
    enabled:
      options.enabled !== false && canUseMobileFeatureData(profile, "member"),
    networkMode: "always",
    queryFn: () => getMemberPayables({ online }),
    queryKey: memberPayablesQueryKey(account),
  })
}
