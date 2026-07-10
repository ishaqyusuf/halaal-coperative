import {
  createDbRuntime,
  getMemberByUserId,
  listFoodPurchaseApplications,
  listFoodPurchaseCycles,
  listMembers,
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

    const [cycles, applications] = await Promise.all([
      listFoodPurchaseCycles({ tenantId: context.tenant.id }),
      listFoodPurchaseApplications({
        memberId: member.id,
        tenantId: context.tenant.id,
      }),
    ])

    return {
      state: "member-ready" as const,
      applications,
      cycles,
      member,
    }
  }

  const [cycles, applications, members] = await Promise.all([
    listFoodPurchaseCycles({ tenantId: context.tenant.id }),
    listFoodPurchaseApplications({ tenantId: context.tenant.id }),
    listMembers(context.tenant.id, { page: 1, pageSize: 200 }),
  ])

  return {
    state: "staff-ready" as const,
    applications,
    canRecordAccounting: canSubmitApplications,
    canReleaseFunds,
    canReviewAccounting: canReleaseFunds,
    canReviewApplications: canSubmitApplications,
    canSubmitApplications,
    cycles,
    memberOptions: members.items.map((member) => ({
      id: member.id,
      label: `${member.fullName} (${member.memberNumber})`,
    })),
    summary: {
      approvedApplications: applications.filter(
        (application) => application.status === "approved"
      ).length,
      openCycles: cycles.filter((cycle) => cycle.status === "open").length,
      pendingApplications: applications.filter((application) =>
        ["submitted", "under_review"].includes(application.status)
      ).length,
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
