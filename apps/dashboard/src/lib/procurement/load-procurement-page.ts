import {
  createDbRuntime,
  getMemberByUserId,
  getTenantOperationProfile,
  getProcurementSummary,
  listMembers,
  listProcurementRequests,
  quoteApplicableCharges,
} from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
} from "@/lib/workspace-access"

export async function loadProcurementPageData() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canSubmit = hasAnyRole(context.auth.membership?.role, allStaffRoles)
  const canUseMemberProcurement = context.auth.membership?.role === "member"
  const canReview = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles
  )

  if (!canSubmit && !canUseMemberProcurement) {
    return { state: "restricted" as const }
  }

  if (!context.tenant || runtime.status !== "database-configured") {
    return { state: "unavailable" as const }
  }

  const operationProfile = await getTenantOperationProfile(context.tenant.id)
  const procurementCapability = operationProfile.services.procurement

  if (canUseMemberProcurement) {
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

    const requests = await listProcurementRequests({
      memberId: member.id,
      tenantId: context.tenant.id,
    })

    if (
      procurementCapability.accessMode === "disabled" &&
      requests.length === 0
    ) {
      return { state: "service-disabled" as const }
    }

    return {
      state: "member-ready" as const,
      chargeOptions: await quoteApplicableCharges({
        basisAmount: 100,
        tenantId: context.tenant.id,
        trigger: "submission",
        workflow: "procurement_request",
      }),
      canCreate: procurementCapability.canMemberCreate,
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
    listProcurementRequests({ tenantId: context.tenant.id }),
    getProcurementSummary(context.tenant.id),
    listMembers(context.tenant.id, { page: 1, pageSize: 200 }),
    quoteApplicableCharges({
      basisAmount: 100,
      tenantId: context.tenant.id,
      trigger: "submission",
      workflow: "procurement_request",
    }),
    quoteApplicableCharges({
      basisAmount: 100,
      tenantId: context.tenant.id,
      trigger: "approval",
      workflow: "procurement_request",
    }),
  ])

  if (
    procurementCapability.accessMode === "disabled" &&
    requests.length === 0
  ) {
    return { state: "service-disabled" as const }
  }

  return {
    state: "staff-ready" as const,
    approvalChargeOptions,
    canCreate: procurementCapability.canStaffCreate,
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
