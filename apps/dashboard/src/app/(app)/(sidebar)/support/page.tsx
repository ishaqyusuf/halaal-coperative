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
import {
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  MemberSupportCasesView,
  SupportCasesView,
} from "@/components/support-cases-view"
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

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const resolvedSearchParams = searchParams ? await searchParams : {}
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
    return (
      <WorkspacePageShell
        eyebrow="Support"
        title="Member support"
        description={
          "Track member service issues, feature requests, and resolution " +
          "history."
        }
      >
        <WorkspaceEmptyState
          body="Support case management is available to cooperative staff."
          title="Support access is restricted."
        />
      </WorkspacePageShell>
    )
  }

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Support"
        title="Member support"
        description={
          "Track member service issues, feature requests, and resolution " +
          "history."
        }
      >
        <WorkspaceEmptyState
          body="Once the database-backed environment is active, this route will show support cases, replies, assignments, and resolution notes."
          title="Support cases need the database runtime."
        />
      </WorkspacePageShell>
    )
  }

  if (canUseMemberSupport) {
    if (!context.auth.user) {
      return (
        <WorkspacePageShell
          eyebrow="Support"
          title="Member support"
          description={
            "Open support or feature requests and track replies from " +
            "cooperative staff."
          }
        >
          <WorkspaceEmptyState
            body="Sign in with your member account to open and track support cases."
            title="Member sign-in required."
          />
        </WorkspacePageShell>
      )
    }

    const member = await getMemberByUserId({
      tenantId: context.tenant.id,
      userId: context.auth.user.id,
    })

    if (!member) {
      return (
        <WorkspacePageShell
          eyebrow="Support"
          title="Member support"
          description={
            "Open support or feature requests and track replies from " +
            "cooperative staff."
          }
        >
          <WorkspaceEmptyState
            body="Your user account is not linked to a member profile in this cooperative."
            title="Member profile not linked."
          />
        </WorkspacePageShell>
      )
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

    return (
      <WorkspacePageShell
        eyebrow="Support"
        title="My support cases"
        description={
          "Open support or feature requests and track replies from cooperative " +
          "staff."
        }
      >
        <MemberSupportCasesView
          cases={cases}
          initialCase={loadMemberSupportCaseInitialValues(
            resolvedSearchParams
          )}
          member={member}
          summary={summary}
        />
      </WorkspacePageShell>
    )
  }

  const [cases, summary, members, users] = await Promise.all([
    listSupportCases({ tenantId: context.tenant.id }),
    getSupportCaseSummary(context.tenant.id),
    listMembers(context.tenant.id, { page: 1, pageSize: 200 }),
    listTenantUsersWithMemberships(context.tenant.id),
  ])
  const memberOptions = members.items.map((member) => ({
    id: member.id,
    label: `${member.fullName} (${member.memberNumber})`,
  }))
  const assignees = users
    .filter((user) =>
      user.memberships.some((membership) =>
        allStaffRoles.includes(membership.role)
      )
    )
    .map((user) => ({
      id: user.id,
      label: `${user.fullName} (${user.email})`,
    }))

  return (
    <WorkspacePageShell
      eyebrow="Support"
      title="Member support"
      description={
        "Document member issues, feature requests, replies, assignments, and " +
        "resolution evidence without changing posted financial records."
      }
    >
      <SupportCasesView
        assignees={assignees}
        canReviewFinancialAdjustments={canReviewFinancialAdjustments}
        cases={cases}
        memberOptions={memberOptions}
        summary={summary}
      />
    </WorkspacePageShell>
  )
}
