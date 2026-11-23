import {
  buildPaymentReceiptCategoryOptions,
  createDbRuntime,
  getMemberPaymentReceiptSummary,
  getMemberScopedPaymentReceiptSummary,
  type PaymentReceiptCategoryOption,
} from "@halaalvest/db"
import {
  getRequestMemberReceiptSubmissionAccess,
  getRequestTenantOperationProfile,
} from "@/lib/navigation/operation-profile"
import { findRequestMemberByUserId } from "@/lib/request-lookups"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"

export { buildPaymentReceiptCategoryOptions, type PaymentReceiptCategoryOption }

export async function loadPaymentReceiptsPageData() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const tenantId = context.tenant?.id
  const canView = hasAnyRole(context.auth.membership?.role, allStaffRoles)
  const canUseMemberReceipts = context.auth.membership?.role === "member"

  if (!canView && !canUseMemberReceipts) {
    return { state: "restricted" as const }
  }

  if (!tenantId || runtime.status !== "database-configured") {
    return { state: "unavailable" as const }
  }

  if (canUseMemberReceipts) {
    if (!context.auth.user) {
      return { state: "member-sign-in-required" as const }
    }

    const member = await findRequestMemberByUserId({
      tenantId,
      userId: context.auth.user.id,
    })

    if (!member) {
      return { state: "member-profile-missing" as const }
    }

    const [summary, canCreateReceipt] = await Promise.all([
      getMemberScopedPaymentReceiptSummary({
        memberId: member.id,
        tenantId,
      }),
      getRequestMemberReceiptSubmissionAccess(tenantId, context.auth.user.id),
    ])

    return {
      state: "member-ready" as const,
      canCreateReceipt,
      memberId: member.id,
      summary,
    }
  }

  const [summary, operationProfile] = await Promise.all([
    getMemberPaymentReceiptSummary(tenantId),
    getRequestTenantOperationProfile(tenantId),
  ])

  return {
    state: "staff-ready" as const,
    canCreateReceipt: operationProfile.services.payment_receipts.canStaffCreate,
    // Before a member is chosen: categories by service mode only. Choosing a
    // member refines them with that member's own obligations.
    categoryOptions: buildPaymentReceiptCategoryOptions({
      foodPurchaseAccessMode:
        operationProfile.services.food_purchase.accessMode,
      foodPurchaseApplicationsCount: 0,
      procurementAccessMode: operationProfile.services.procurement.accessMode,
      procurementSchedulesCount: 0,
    }),
    summary,
  }
}
