import type { CooperativeRole } from "@halaalvest/auth/roles"
import {
  createDbRuntime,
  getOperationNavRecordPresence,
  getTenantOperationProfile,
} from "@halaalvest/db"
import { cache } from "react"

type OperationProfileNavigationInput = {
  role: CooperativeRole | null
  tenantId?: string | null
  userId?: string | null
}

const memberRoles = new Set<CooperativeRole>(["member"])

/**
 * Per-request operation profile. The sidebar layout, the setup gate and page
 * loaders all read it, so it resolves once per request.
 */
export const getRequestTenantOperationProfile = cache((tenantId: string) =>
  getTenantOperationProfile(tenantId)
)

const getHiddenNavPaths = cache(
  async (
    role: CooperativeRole | null,
    tenantId: string,
    userId: string | null
  ) => {
    const isMember = role ? memberRoles.has(role) : false
    const [operationProfile, presence] = await Promise.all([
      getRequestTenantOperationProfile(tenantId),
      getOperationNavRecordPresence({
        memberUserId: isMember ? userId : null,
        tenantId,
      }),
    ])
    const hiddenPaths: string[] = []
    const navKey = isMember ? "shouldShowInMemberNav" : "shouldShowInStaffNav"
    const { services } = operationProfile

    if (!services.procurement[navKey] && !presence.procurement) {
      hiddenPaths.push("/procurement")
    }

    if (!services.food_purchase[navKey] && !presence.foodPurchase) {
      hiddenPaths.push("/food-purchase")
    }

    if (!services.support_cases[navKey] && !presence.support) {
      hiddenPaths.push("/support")
    }

    if (!services.payment_receipts[navKey] && !presence.paymentReceipts) {
      hiddenPaths.push("/payment-receipts")
    }

    return hiddenPaths
  }
)

export async function getOperationProfileHiddenNavPaths({
  role,
  tenantId,
  userId,
}: OperationProfileNavigationInput) {
  if (!tenantId || createDbRuntime().status !== "database-configured") {
    return []
  }

  return getHiddenNavPaths(role, tenantId, userId ?? null)
}
