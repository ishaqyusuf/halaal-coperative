import {
  createDbRuntime,
  getFoodPurchaseApplicationSummary,
  getMemberByUserId,
  getTenantOperationProfile,
  listFoodPurchaseCycles,
  listMembers,
  quoteApplicableCharges,
} from "@halaalvest/db"
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

  const operationProfile = await getTenantOperationProfile(context.tenant.id)
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

    const [cycles, applicationSummary, chargeOptions] = await Promise.all([
      listFoodPurchaseCycles({ tenantId: context.tenant.id }),
      getFoodPurchaseApplicationSummary({
        memberId: member.id,
        tenantId: context.tenant.id,
      }),
      quoteApplicableCharges({
        basisAmount: 100,
        tenantId: context.tenant.id,
        trigger: "submission",
        workflow: "food_purchase_application",
      }),
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
      canCreateApplication: foodPurchaseCapability.canMemberCreate,
      chargeOptions,
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
      member: {
        fullName: member.fullName,
        memberNumber: member.memberNumber,
      },
      summary: applicationSummary,
    }
  }

  const [
    cycles,
    applicationSummary,
    members,
    submissionChargeOptions,
    approvalChargeOptions,
  ] = await Promise.all([
    listFoodPurchaseCycles({ tenantId: context.tenant.id }),
    getFoodPurchaseApplicationSummary({ tenantId: context.tenant.id }),
    listMembers(context.tenant.id, { page: 1, pageSize: 200 }),
    quoteApplicableCharges({
      basisAmount: 100,
      tenantId: context.tenant.id,
      trigger: "submission",
      workflow: "food_purchase_application",
    }),
    quoteApplicableCharges({
      basisAmount: 100,
      tenantId: context.tenant.id,
      trigger: "approval",
      workflow: "food_purchase_application",
    }),
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
    approvalChargeOptions,
    canRecordAccounting: canSubmitApplications,
    canReleaseFunds: canReleaseFunds && foodPurchaseCapability.canStaffCreate,
    canReviewAccounting: canReleaseFunds,
    canReviewApplications: canSubmitApplications,
    canSubmitApplications:
      canSubmitApplications && foodPurchaseCapability.canStaffCreate,
    cycles,
    memberOptions: members.items.map((member) => ({
      id: member.id,
      label: `${member.fullName} (${member.memberNumber})`,
    })),
    submissionChargeOptions,
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
