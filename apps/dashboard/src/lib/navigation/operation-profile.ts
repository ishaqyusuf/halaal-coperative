import type { CooperativeRole } from "@halaalvest/auth/roles"
import {
  createDbRuntime,
  getMemberByUserId,
  getTenantOperationProfile,
  listFoodPurchaseApplications,
  listMemberPaymentReceipts,
  listProcurementRequests,
  listSupportCases,
} from "@halaalvest/db"

type OperationProfileNavigationInput = {
  role: CooperativeRole | null
  tenantId?: string | null
  userId?: string | null
}

const memberRoles = new Set<CooperativeRole>(["member"])

export async function getOperationProfileHiddenNavPaths({
  role,
  tenantId,
  userId,
}: OperationProfileNavigationInput) {
  if (!tenantId || createDbRuntime().status !== "database-configured") {
    return []
  }

  const operationProfile = await getTenantOperationProfile(tenantId)
  const hiddenPaths: string[] = []
  const isMember = role ? memberRoles.has(role) : false
  const member = isMember && userId ? await getMemberByUserId({ tenantId, userId }) : null
  const memberId = member?.id

  const [
    procurementRecords,
    foodPurchaseRecords,
    supportRecords,
    receiptRecords,
  ] = await Promise.all([
    listProcurementRequests({
      limit: 1,
      memberId,
      tenantId,
    }),
    listFoodPurchaseApplications({
      limit: 1,
      memberId,
      tenantId,
    }),
    listSupportCases({
      limit: 1,
      memberId,
      tenantId,
    }),
    listMemberPaymentReceipts(tenantId, {
      limit: 1,
      memberId,
    }),
  ])

  const procurement = operationProfile.services.procurement
  const foodPurchase = operationProfile.services.food_purchase
  const support = operationProfile.services.support_cases
  const receipts = operationProfile.services.payment_receipts

  if (isMember) {
    if (!procurement.shouldShowInMemberNav && procurementRecords.length === 0) {
      hiddenPaths.push("/procurement")
    }

    if (
      !foodPurchase.shouldShowInMemberNav &&
      foodPurchaseRecords.length === 0
    ) {
      hiddenPaths.push("/food-purchase")
    }

    if (!support.shouldShowInMemberNav && supportRecords.length === 0) {
      hiddenPaths.push("/support")
    }

    if (!receipts.shouldShowInMemberNav && receiptRecords.length === 0) {
      hiddenPaths.push("/payment-receipts")
    }

    return hiddenPaths
  }

  if (!procurement.shouldShowInStaffNav && procurementRecords.length === 0) {
    hiddenPaths.push("/procurement")
  }

  if (!foodPurchase.shouldShowInStaffNav && foodPurchaseRecords.length === 0) {
    hiddenPaths.push("/food-purchase")
  }

  if (!support.shouldShowInStaffNav && supportRecords.length === 0) {
    hiddenPaths.push("/support")
  }

  if (!receipts.shouldShowInStaffNav && receiptRecords.length === 0) {
    hiddenPaths.push("/payment-receipts")
  }

  return hiddenPaths
}
