import {
  createDbRuntime,
  getProjectFinancingSummary,
  isMemberOperationallyReady,
  tenantHasMembers,
} from "@halaalvest/db"
import { findRequestMemberByUserId } from "@/lib/request-lookups"
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

    const member = await findRequestMemberByUserId({
      tenantId: context.tenant.id,
      userId: context.auth.user.id,
    })

    if (!member) {
      return { state: "member-profile-missing" as const }
    }

    // A member who is not verified sees a plain notice, not a form that fails.
    const [summary, isReady] = await Promise.all([
      getProjectFinancingSummary(context.tenant.id, undefined, member.id),
      isMemberOperationallyReady({
        member,
        tenantId: context.tenant.id,
      }),
    ])

    return {
      state: "member-ready" as const,
      canCreate: Boolean(isReady),
      needsVerification: !isReady,
      summary,
    }
  }

  // Charges load only when a form opens.
  const [summary, hasMembers] = await Promise.all([
    getProjectFinancingSummary(context.tenant.id),
    tenantHasMembers(context.tenant.id),
  ])

  return {
    state: "staff-ready" as const,
    canCreate: canSubmit,
    canReview,
    hasMembers,
    summary,
  }
}
