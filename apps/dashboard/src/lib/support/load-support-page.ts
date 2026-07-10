import {
  createDbRuntime,
  getMemberByUserId,
  getMemberSupportCaseSummary,
  getSupportCaseSummary,
  listMembers,
  listSupportCases,
  listTenantUsersWithMemberships,
  type SupportCaseCategory,
} from "@halaalvest/db"
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

    const member = await getMemberByUserId({
      tenantId: context.tenant.id,
      userId: context.auth.user.id,
    })

    if (!member) {
      return { state: "member-profile-missing" as const }
    }

    const [cases, summary] = await Promise.all([
      listSupportCases({
        memberId: member.id,
        tenantId: context.tenant.id,
      }),
      getMemberSupportCaseSummary({
        memberId: member.id,
        tenantId: context.tenant.id,
      }),
    ])

    return {
      state: "member-ready" as const,
      cases,
      initialCase: loadMemberSupportCaseInitialValues(searchParams),
      member,
      summary,
    }
  }

  const [cases, summary, members, users] = await Promise.all([
    listSupportCases({ tenantId: context.tenant.id }),
    getSupportCaseSummary(context.tenant.id),
    listMembers(context.tenant.id, { page: 1, pageSize: 200 }),
    listTenantUsersWithMemberships(context.tenant.id),
  ])

  return {
    state: "staff-ready" as const,
    assignees: users
      .filter((user) =>
        user.memberships.some((membership) =>
          allStaffRoles.includes(membership.role)
        )
      )
      .map((user) => ({
        id: user.id,
        label: `${user.fullName} (${user.email})`,
      })),
    canReviewFinancialAdjustments,
    cases,
    memberOptions: members.items.map((member) => ({
      id: member.id,
      label: `${member.fullName} (${member.memberNumber})`,
    })),
    summary,
  }
}
