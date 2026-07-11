import {
  createDbRuntime,
  getMemberByUserId,
  getProjectFinancingSummary,
  listMembers,
  listProjectFinancingRequests,
  quoteApplicableCharges,
} from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
} from "@/lib/workspace-access"

export async function loadProjectFinancingPageData() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canSubmit = hasAnyRole(context.auth.membership?.role, allStaffRoles)
  const canUseMemberProjectFinancing =
    context.auth.membership?.role === "member"
  const canReview = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles
  )

  if (!canSubmit && !canUseMemberProjectFinancing) {
    return { state: "restricted" as const }
  }

  if (!context.tenant || runtime.status !== "database-configured") {
    return { state: "unavailable" as const }
  }

  if (canUseMemberProjectFinancing) {
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

    const [requests, chargeOptions] = await Promise.all([
      listProjectFinancingRequests({
        memberId: member.id,
        tenantId: context.tenant.id,
      }),
      quoteApplicableCharges({
        basisAmount: 100,
        tenantId: context.tenant.id,
        trigger: "submission",
        workflow: "project_financing_request",
      }),
    ])

    return {
      state: "member-ready" as const,
      chargeOptions,
      member,
      requests,
    }
  }

  const [
    requests,
    summary,
    members,
    submissionChargeOptions,
    approvalChargeOptions,
  ] = await Promise.all([
    listProjectFinancingRequests({ tenantId: context.tenant.id }),
    getProjectFinancingSummary(context.tenant.id),
    listMembers(context.tenant.id, { page: 1, pageSize: 200 }),
    quoteApplicableCharges({
      basisAmount: 100,
      tenantId: context.tenant.id,
      trigger: "submission",
      workflow: "project_financing_request",
    }),
    quoteApplicableCharges({
      basisAmount: 100,
      tenantId: context.tenant.id,
      trigger: "approval",
      workflow: "project_financing_request",
    }),
  ])

  return {
    state: "staff-ready" as const,
    approvalChargeOptions,
    canReview,
    memberOptions: members.items.map((member) => ({
      id: member.id,
      label: `${member.fullName} (${member.memberNumber})`,
    })),
    requests,
    submissionChargeOptions,
    summary,
  }
}
