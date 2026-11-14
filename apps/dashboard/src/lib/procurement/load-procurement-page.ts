import {
  createDbRuntime,
  getMemberByUserId,
  getMemberOperationalReadiness,
  getProcurementSummary,
  tenantHasMembers,
} from "@halaalvest/db"
import { getRequestTenantOperationProfile } from "@/lib/navigation/operation-profile"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
} from "@/lib/workspace-access"

/**
 * Procurement page data. The operation profile is the per-request copy the
 * sidebar already read; charges load only when a form opens.
 */
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

  const operationProfile = await getRequestTenantOperationProfile(
    context.tenant.id
  )
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

    // Readiness is read only when the member could ask, so a member who is
    // not verified sees a plain notice instead of a form that will fail.
    const [summary, readiness] = await Promise.all([
      getProcurementSummary(context.tenant.id, undefined, member.id),
      procurementCapability.canMemberCreate
        ? getMemberOperationalReadiness({
            memberId: member.id,
            tenantId: context.tenant.id,
          })
        : null,
    ])

    if (
      procurementCapability.accessMode === "disabled" &&
      summary.totalRequests === 0
    ) {
      return { state: "service-disabled" as const }
    }

    return {
      state: "member-ready" as const,
      canCreate: Boolean(readiness?.isReady),
      needsVerification:
        procurementCapability.canMemberCreate && !readiness?.isReady,
      summary,
    }
  }

  const [summary, hasMembers] = await Promise.all([
    getProcurementSummary(context.tenant.id),
    tenantHasMembers(context.tenant.id),
  ])

  if (
    procurementCapability.accessMode === "disabled" &&
    summary.totalRequests === 0
  ) {
    return { state: "service-disabled" as const }
  }

  return {
    state: "staff-ready" as const,
    canCreate: procurementCapability.canStaffCreate,
    canReview,
    hasMembers,
    summary,
  }
}
