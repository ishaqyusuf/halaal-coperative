import {
  buildPaymentReceiptCategoryOptions,
  createDbRuntime,
  getMemberByUserId,
  getMemberPaymentReceiptSummary,
  getMemberScopedPaymentReceiptSummary,
  listPaymentReceiptMemberOptions,
  type PaymentReceiptCategoryOption,
} from "@halaalvest/db"
import { getRequestTenantOperationProfile } from "@/lib/navigation/operation-profile"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"

export { buildPaymentReceiptCategoryOptions, type PaymentReceiptCategoryOption }

// Staff pages load only the summary and the category list. A receipt's
// plans, loans and requests are loaded for one member when staff pick that
// member in the receipt sheet (`paymentReceipts.memberOptions`); the page no
// longer reads every member's lists on each visit. A member's own page loads
// their lists up front, which is bounded to that member.
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

    const member = await getMemberByUserId({
      tenantId,
      userId: context.auth.user.id,
    })

    if (!member) {
      return { state: "member-profile-missing" as const }
    }

    const [summary, options, operationProfile] = await Promise.all([
      getMemberScopedPaymentReceiptSummary({
        memberId: member.id,
        tenantId,
      }),
      listPaymentReceiptMemberOptions({ memberId: member.id, tenantId }),
      getRequestTenantOperationProfile(tenantId),
    ])

    return {
      state: "member-ready" as const,
      canCreateReceipt:
        operationProfile.services.payment_receipts.canMemberCreate,
      categoryOptions: options.categoryOptions,
      commitmentPlans: options.commitmentPlans,
      foodPurchaseApplications: options.foodPurchaseApplications,
      loans: options.loans,
      member,
      procurementSchedules: options.procurementSchedules,
      projectFinancingRequests: options.projectFinancingRequests,
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
