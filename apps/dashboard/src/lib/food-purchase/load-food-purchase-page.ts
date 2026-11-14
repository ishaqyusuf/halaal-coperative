import {
  createDbRuntime,
  getFoodPurchaseApplicationSummary,
  getMemberByUserId,
  getMemberOperationalReadiness,
  listFoodPurchaseCycles,
} from "@halaalvest/db"
import { getRequestTenantOperationProfile } from "@/lib/navigation/operation-profile"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
} from "@/lib/workspace-access"

export async function loadFoodPurchasePageData() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canSubmitApplications = hasAnyRole(
    context.auth.membership?.role,
    allStaffRoles
  )
  const canUseMemberFoodPurchase = context.auth.membership?.role === "member"
  const canReleaseFunds = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles
  )

  if (!canSubmitApplications && !canUseMemberFoodPurchase) {
    return { state: "restricted" as const }
  }

  if (!context.tenant || runtime.status !== "database-configured") {
    return { state: "unavailable" as const }
  }

  // The per-request copy the sidebar already read; charges load when a form opens.
  const operationProfile = await getRequestTenantOperationProfile(
    context.tenant.id
  )
  const foodPurchaseCapability = operationProfile.services.food_purchase

  if (canUseMemberFoodPurchase) {
    if (!context.auth.user) {
      return { state: "member-sign-in-required" as const }
    }

    const member = await getMemberByUserId({
      tenantId: context.tenant.id,
      userId: context.auth.user.id,
    })

    if (!member) {
      return { state: "member-profile-missing" as const }
    }

    // A member who is not verified sees a plain notice, not a form that fails.
    const [cycles, applicationSummary, readiness] = await Promise.all([
      listFoodPurchaseCycles({ tenantId: context.tenant.id }),
      getFoodPurchaseApplicationSummary({
        memberId: member.id,
        tenantId: context.tenant.id,
      }),
      foodPurchaseCapability.canMemberCreate
        ? getMemberOperationalReadiness({
            memberId: member.id,
            tenantId: context.tenant.id,
          })
        : null,
    ])

    if (
      foodPurchaseCapability.accessMode === "disabled" &&
      cycles.length === 0 &&
      applicationSummary.totalApplications === 0
    ) {
      return { state: "service-disabled" as const }
    }

    return {
      state: "member-ready" as const,
      canCreateApplication: Boolean(readiness?.isReady),
      needsVerification:
        foodPurchaseCapability.canMemberCreate && !readiness?.isReady,
      cycles: cycles.map((cycle) => ({
        ...cycle,
        accountingSubmittedByUser: cycle.accountingSubmittedByUser
          ? {
              fullName: cycle.accountingSubmittedByUser.fullName,
              id: cycle.accountingSubmittedByUser.id,
            }
          : null,
        releasedByUser: {
          fullName: cycle.releasedByUser.fullName,
          id: cycle.releasedByUser.id,
        },
      })),
      summary: applicationSummary,
    }
  }

  const [cycles, applicationSummary] = await Promise.all([
    listFoodPurchaseCycles({ tenantId: context.tenant.id }),
    getFoodPurchaseApplicationSummary({ tenantId: context.tenant.id }),
  ])

  if (
    foodPurchaseCapability.accessMode === "disabled" &&
    cycles.length === 0 &&
    applicationSummary.totalApplications === 0
  ) {
    return { state: "service-disabled" as const }
  }

  return {
    state: "staff-ready" as const,
    canRecordAccounting: canSubmitApplications,
    canReleaseFunds: canReleaseFunds && foodPurchaseCapability.canStaffCreate,
    canReviewAccounting: canReleaseFunds,
    canReviewApplications: canSubmitApplications,
    canSubmitApplications:
      canSubmitApplications && foodPurchaseCapability.canStaffCreate,
    cycles,
    summary: {
      approvedApplications: applicationSummary.approvedApplications,
      openCycles: cycles.filter((cycle) => cycle.status === "open").length,
      pendingApplications: applicationSummary.pendingApplications,
      reportedProfit: cycles.reduce(
        (total, cycle) => total + (cycle.profitAmount ?? 0),
        0
      ),
      submittedAccounting: cycles.filter(
        (cycle) => cycle.status === "accounting_submitted"
      ).length,
      totalReleasedAmount: cycles.reduce(
        (total, cycle) => total + cycle.releasedAmount,
        0
      ),
    },
  }
}
