import {
  createDbRuntime,
  getMobileMemberProcurementService,
  getProcurementSummary,
  tenantHasMembers,
} from "@halaalvest/db"
import { getRequestTenantOperationProfile } from "@/lib/navigation/operation-profile"
import { procurementMemberState } from "@/lib/requests/member-service-state"
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

    // The same availability read the mobile app uses, so the states and the
    // "Not yet" checklist come from the server's real reasons.
    const service = await getMobileMemberProcurementService({
      tenantId: context.tenant.id,
      userId: context.auth.user.id,
    })

    if (service.state === "member_profile_missing") {
      return { state: "member-profile-missing" as const }
    }

    if (service.state !== "available") {
      return { state: "unavailable" as const }
    }

    return {
      state: "member-ready" as const,
      canCreate: service.canCreateRequest,
      ...procurementMemberState(service),
      summary: service.summary,
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
