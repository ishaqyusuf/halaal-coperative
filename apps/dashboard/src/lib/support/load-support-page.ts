import {
  createDbRuntime,
  getSupportCaseSummary,
  listTenantUsersWithRoles,
  type SupportCaseCategory,
} from "@halaalvest/db"
import { getRequestTenantOperationProfile } from "@/lib/navigation/operation-profile"
import { findRequestMemberByUserId } from "@/lib/request-lookups"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
} from "@/lib/workspace-access"

const supportCaseCategories = new Set<SupportCaseCategory>([
  "payment_issue",
  "account_update",
  "shares",
  "financing",
  "procurement",
  "feature_request",
  "technical",
  "other",
])

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }

  return value ?? ""
}

function loadMemberSupportCaseInitialValues(
  searchParams: Record<string, string | string[] | undefined>
) {
  const category = firstParam(searchParams.category)
  const moneyImpactRequested = firstParam(searchParams.moneyImpactRequested)

  return {
    attachmentUrl: firstParam(searchParams.attachmentUrl),
    category: supportCaseCategories.has(category as SupportCaseCategory)
      ? (category as SupportCaseCategory)
      : undefined,
    description: firstParam(searchParams.description),
    moneyImpactRequested:
      moneyImpactRequested === "true" || moneyImpactRequested === "on",
    subject: firstParam(searchParams.subject),
  }
}

export async function loadSupportPageData(
  searchParams: Record<string, string | string[] | undefined>
) {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageSupport = hasAnyRole(
    context.auth.membership?.role,
    allStaffRoles
  )
  const canReviewFinancialAdjustments = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles
  )
  const canUseMemberSupport = context.auth.membership?.role === "member"

  if (!canManageSupport && !canUseMemberSupport) {
    return { state: "restricted" as const }
  }

  if (!context.tenant || runtime.status !== "database-configured") {
    return { state: "unavailable" as const }
  }

  if (canUseMemberSupport) {
    if (!context.auth.user) {
      return { state: "member-sign-in-required" as const }
    }

    // Request-cached: the tRPC prefetch reuses this lookup.
    const member = await findRequestMemberByUserId({
      tenantId: context.tenant.id,
      userId: context.auth.user.id,
    })

    if (!member) {
      return { state: "member-profile-missing" as const }
    }

    // Members see their own list only; no summary counts are loaded.
    const operationProfile = await getRequestTenantOperationProfile(
      context.tenant.id
    )

    return {
      state: "member-ready" as const,
      canCreateSupportCases:
        operationProfile.services.support_cases.canMemberCreate,
      initialCase: loadMemberSupportCaseInitialValues(searchParams),
    }
  }

  const [summary, users, operationProfile] = await Promise.all([
    getSupportCaseSummary(context.tenant.id),
    listTenantUsersWithRoles(context.tenant.id, allStaffRoles),
    getRequestTenantOperationProfile(context.tenant.id),
  ])

  return {
    state: "staff-ready" as const,
    assignees: users.map((user) => ({
      id: user.id,
      label: user.fullName,
    })),
    canReviewFinancialAdjustments,
    canCreateSupportCases:
      operationProfile.services.support_cases.canStaffCreate,
    summary,
  }
}
