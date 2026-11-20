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
const serviceLinks = [
  { service: "procurement", presence: "procurement", path: "/procurement" },
  {
    service: "food_purchase",
    presence: "foodPurchase",
    path: "/food-purchase",
  },
  { service: "support_cases", presence: "support", path: "/support" },
  {
    service: "payment_receipts",
    presence: "paymentReceipts",
    path: "/payment-receipts",
  },
] as const

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
    const operationProfile = await getRequestTenantOperationProfile(tenantId)
    const navKey = isMember ? "shouldShowInMemberNav" : "shouldShowInStaffNav"
    const linksToCheck = serviceLinks.filter(
      ({ service }) => !operationProfile.services[service][navKey]
    )
    if (linksToCheck.length === 0) return []

    // Existing records keep a hidden-by-default service reachable.
    const presence = await getOperationNavRecordPresence({
      memberUserId: isMember ? userId : null,
      services: new Set(linksToCheck.map((link) => link.presence)),
      tenantId,
    })
    return linksToCheck
      .filter((link) => !presence[link.presence])
      .map((link) => link.path)
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
