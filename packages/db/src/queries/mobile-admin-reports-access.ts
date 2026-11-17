import { QueryInfrastructureError } from "../query-error"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import {
  getMobileReportCatalog,
  type MobileReportKey,
} from "@halaalvest/domain/mobile-reports"
import { listActivityReportEvents } from "./audit"
import {
  listTenantUsersWithMemberships,
  provisionTenantUserRole,
  type MembershipRole,
} from "./auth"
import { getOverviewSummary } from "./dashboard"
import { getDeployableFundsSnapshot } from "./financing-cycles"

export type MobileFeatureAdminReportCard = {
  available: boolean
  category: "finance" | "governance" | "members" | "operations"
  detail: string
  key: MobileReportKey
  metricFormat: "count" | "currency" | "percent"
  metricLabel: string
  metricValue: number
  rowLimit: number
  title: string
}

export type MobileFeatureAdminReports = {
  activityEvents: Array<{
    action: string
    actionLabel: string
    actorLabel: string
    actorType: string
    authorizationRole: string
    authorizerLabel: string
    entityId: string | null
    entityType: string
    id: string
    metadataSummary: string[]
    occurredAt: string
  }>
  collectionFollowUps: Array<{
    caseStage: string
    createdAt: string
    id: string
    loanProductName: string
    memberName: string
    memberNumber: string
    nextActionAt: string | null
    note: string
    priority: string
    repaymentScheduleItemId: string
    resolutionStatus: string
    status: string
  }>
  generatedAt: string
  reports: MobileFeatureAdminReportCard[]
  stats: Array<{
    detail: string
    format: "count" | "currency" | "percent"
    key: string
    label: string
    value: number
  }>
}

export type MobileFeatureAdminAccess = {
  generatedAt: string
  roles: Array<{
    defaultUsersCount: number
    label: string
    role: MembershipRole
    scope: string
    usersCount: number
  }>
  summary: {
    defaultRoles: number
    memberUsers: number
    roleAssignments: number
    staffUsers: number
    workspaceUsers: number
  }
  users: Array<{
    defaultRoleLabel: string | null
    email: string
    fullName: string
    id: string
    isPlatformOwner: boolean
    memberships: Array<{
      id: string
      isDefault: boolean
      label: string
      role: MembershipRole
    }>
  }>
}

const roles: MembershipRole[] = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
  "member",
]

function roleLabel(role: MembershipRole) {
  return {
    finance_officer: "Finance Officer",
    member: "Member",
    operations_officer: "Operations Officer",
    super_admin: "Super Admin",
    tenant_admin: "Cooperative Admin",
  }[role]
}

function roleScope(role: MembershipRole) {
  return {
    finance_officer: "Financial operations, reports, collections, and reviews.",
    member: "Member-facing visibility into cooperative activity.",
    operations_officer: "Member operations, support, and coordination.",
    super_admin: "Platform-level oversight across cooperative workspaces.",
    tenant_admin:
      "Administrative control over cooperative setup and operations.",
  }[role]
}

function queueCount(
  summary: Awaited<ReturnType<typeof getOverviewSummary>>,
  key: string
) {
  return summary.actionQueue.find((item) => item.key === key)?.count ?? 0
}

type ReportMetrics = { memberCount: number; outstandingLoans: number }

function buildReportCards(
  metrics: ReportMetrics,
  summary: Awaited<ReturnType<typeof getOverviewSummary>>,
): MobileFeatureAdminReportCard[] {
  return getMobileReportCatalog().map((report) => {
    const metric = {
      audit: ["Recent events", summary.recentActivity.length, "count"],
      charges: ["Open queue", queueCount(summary, "charges"), "count"],
      contributions: [
        "Received this period",
        summary.contributionHealth.receivedThisMonth,
        "currency",
      ],
      financing: ["Outstanding", metrics.outstandingLoans, "currency"],
      foodPurchase: [
        "Open queue",
        queueCount(summary, "food-purchase-applications") +
          queueCount(summary, "food-purchase-accounting"),
        "count",
      ],
      memberStatements: ["Members", metrics.memberCount, "count"],
      members: ["Members", metrics.memberCount, "count"],
      openingBalances: ["Row limit", report.rowLimit, "count"],
      paymentReceipts: [
        "Pending review",
        queueCount(summary, "payment-receipts"),
        "count",
      ],
      procurement: [
        "Pending review",
        queueCount(summary, "procurement-requests"),
        "count",
      ],
      profit: [
        "Pending allocation",
        summary.shareAndProfitPosition.profitPendingAllocation,
        "currency",
      ],
      projectFinancing: [
        "Pending review",
        queueCount(summary, "project-financing-requests"),
        "count",
      ],
      repayments: ["Outstanding", metrics.outstandingLoans, "currency"],
      shares: [
        "Share capital",
        summary.shareAndProfitPosition.shareCapitalBalance,
        "currency",
      ],
      specialSavings: [
        "Row limit",
        report.rowLimit,
        "count",
      ],
      support: ["Open cases", queueCount(summary, "support-cases"), "count"],
    } satisfies Record<
      MobileReportKey,
      [string, number, "count" | "currency" | "percent"]
    >

    const [metricLabel, metricValue, metricFormat] = metric[report.key]
    return {
      ...report,
      metricFormat,
      metricLabel,
      metricValue,
    }
  })
}

export async function getMobileAdminReportsOverview(
  tenantId: string,
): Promise<MobileFeatureAdminReports> {
  const prisma = createPrismaClient()
  if (!prisma) {
    return {
      activityEvents: [],
      collectionFollowUps: [],
      generatedAt: new Date().toISOString(),
      reports: [],
      stats: [
        {
          detail: "Database runtime unavailable",
          format: "count",
          key: "report-count",
          label: "Reports",
          value: 0,
        },
      ],
    }
  }

  // T23: one deployable-funds snapshot feeds the summary and the
  // outstanding figure; member counts come from one grouped read instead of
  // the dashboard KPIs (loan and schedule counts the cards never show); the
  // screen reads activity from its own paged procedure, so the overview no
  // longer loads 8 events and 8 collection follow-ups. Both lists stay in the
  // payload, empty, for older builds.
  const deployableFunds = getDeployableFundsSnapshot({ tenantId }, prisma)
  const [summary, memberStatuses, funds] = await Promise.all([
    getOverviewSummary(tenantId, prisma, {
      deployableFunds,
      queueRows: "open-items",
    }),
    prisma.member.groupBy({
      _count: { _all: true },
      by: ["status"],
      where: { tenantId },
    }),
    deployableFunds,
  ])
  const memberCount = memberStatuses.reduce(
    (total, row) => total + row._count._all,
    0
  )
  const activeMemberCount =
    memberStatuses.find((row) => row.status === "active")?._count._all ?? 0
  const reports = buildReportCards(
    { memberCount, outstandingLoans: funds.outstandingFinancingAmount },
    summary
  )

  return {
    activityEvents: [],
    collectionFollowUps: [],
    generatedAt: summary.workspace.generatedAt,
    reports,
    stats: [
      {
        detail: "Mobile-safe report previews",
        format: "count",
        key: "report-count",
        label: "Reports",
        value: reports.length,
      },
      {
        detail: "Active members in this workspace",
        format: "count",
        key: "active-members",
        label: "Active members",
        value: activeMemberCount,
      },
      {
        detail: "Open operational queue items",
        format: "count",
        key: "action-queue",
        label: "Action queue",
        value: summary.primaryMetrics.actionQueueTotal,
      },
    ],
  }
}

export async function getMobileAdminAccessOverview(
  tenantId: string
): Promise<MobileFeatureAdminAccess> {
  const users = (await listTenantUsersWithMemberships(tenantId)).map((user) => {
    const memberships = user.memberships
      .filter((membership) => membership.tenantId === tenantId)
      .map((membership) => ({
        id: membership.id,
        isDefault: membership.isDefault,
        label: roleLabel(membership.role),
        role: membership.role,
      }))
    return {
      defaultRoleLabel:
        memberships.find((membership) => membership.isDefault)?.label ?? null,
      email: user.email,
      fullName: user.fullName,
      id: user.id,
      isPlatformOwner: user.isPlatformOwner,
      memberships,
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    roles: roles.map((role) => {
      const assigned = users.filter((user) =>
        user.memberships.some((membership) => membership.role === role)
      )
      return {
        defaultUsersCount: assigned.filter((user) =>
          user.memberships.some(
            (membership) => membership.role === role && membership.isDefault
          )
        ).length,
        label: roleLabel(role),
        role,
        scope: roleScope(role),
        usersCount: assigned.length,
      }
    }),
    summary: {
      defaultRoles: users.filter((user) => user.defaultRoleLabel).length,
      memberUsers: users.filter((user) =>
        user.memberships.some((membership) => membership.role === "member")
      ).length,
      roleAssignments: users.reduce(
        (total, user) => total + user.memberships.length,
        0
      ),
      staffUsers: users.filter((user) =>
        user.memberships.some((membership) => membership.role !== "member")
      ).length,
      workspaceUsers: users.length,
    },
    users,
  }
}

type AccessUser = MobileFeatureAdminAccess["users"][number]
type AccessCursor = { id: string; group: "staff" | "members" }

export async function countMobileAdminAccessUsers(tenantId: string) {
  const prisma = createPrismaClient()
  const workspaceUsers = prisma
    ? await prisma.user.count({ where: { tenantId, deletedAt: null } })
    : (await listTenantUsersWithMemberships(tenantId)).length
  return { workspaceUsers }
}

export async function getMobileAdminAccessStats(tenantId: string) {
  const prisma = createPrismaClient()
  if (!prisma) {
    const { summary, roles } = await getMobileAdminAccessOverview(tenantId)
    return { summary, roles }
  }

  const where = { tenantId, deletedAt: null }
  const [workspaceUsers, staffUsers, defaultRoles, roleGroups] =
    await Promise.all([
      prisma.user.count({ where }),
      prisma.user.count({
        where: {
          ...where,
          memberships: { some: { tenantId, role: { not: "member" } } },
        },
      }),
      prisma.user.count({
        where: {
          ...where,
          memberships: { some: { tenantId, isDefault: true } },
        },
      }),
      prisma.membership.groupBy({
        by: ["role", "isDefault"],
        where: { tenantId, user: where },
        _count: { _all: true },
      }),
    ])
  const catalogue = roles.map((role) => ({
    defaultUsersCount:
      roleGroups.find((group) => group.role === role && group.isDefault)?._count
        ._all ?? 0,
    label: roleLabel(role),
    role,
    scope: roleScope(role),
    usersCount: roleGroups.reduce(
      (sum, group) => sum + (group.role === role ? group._count._all : 0),
      0
    ),
  }))
  return {
    roles: catalogue,
    summary: {
      defaultRoles,
      memberUsers:
        catalogue.find((role) => role.role === "member")?.usersCount ?? 0,
      roleAssignments: roleGroups.reduce(
        (sum, group) => sum + group._count._all,
        0
      ),
      staffUsers,
      workspaceUsers,
    },
  }
}

export async function listMobileAdminAccessPage(input: {
  tenantId: string
  cursor?: AccessCursor | null
  limit: number
  search?: string
}): Promise<{ users: AccessUser[]; nextCursor: AccessCursor | null }> {
  const { cursor, limit, search, tenantId } = input
  const prisma = createPrismaClient()
  const staff = { tenantId, role: { not: "member" as const } }

  async function readGroup(group: AccessCursor["group"], take: number) {
    const after = cursor?.group === group ? cursor.id : undefined
    if (!prisma) {
      const { users } = await getMobileAdminAccessOverview(tenantId)
      const term = search?.toLowerCase()
      return users
        .filter(
          (user) =>
            user.memberships.some(
              (membership) => membership.role !== "member"
            ) ===
              (group === "staff") &&
            (!after || user.id > after) &&
            (!term ||
              [user.fullName, user.email].some((field) =>
                field.toLowerCase().includes(term)
              ))
        )
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, take)
    }

    // Escape LIKE wildcards so search treats their characters literally.
    const contains = search?.replace(/[\\%_]/g, "\\$&")
    const users = await prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        id: after ? { gt: after } : undefined,
        memberships: group === "staff" ? { some: staff } : { none: staff },
        OR: contains
          ? [
              { fullName: { contains, mode: "insensitive" } },
              { email: { contains, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { id: "asc" },
      take,
      select: {
        email: true,
        fullName: true,
        id: true,
        isPlatformOwner: true,
        memberships: {
          where: { tenantId },
          select: { id: true, isDefault: true, role: true },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
      },
    })
    return users.map((user) => {
      const memberships = user.memberships.map((membership) => ({
        ...membership,
        label: roleLabel(membership.role),
      }))
      return {
        ...user,
        defaultRoleLabel:
          memberships.find((membership) => membership.isDefault)?.label ?? null,
        memberships,
      }
    })
  }

  const staffUsers =
    cursor?.group === "members" ? [] : await readGroup("staff", limit + 1)
  const memberUsers =
    staffUsers.length > limit
      ? []
      : await readGroup("members", limit + 1 - staffUsers.length)
  const candidates = [...staffUsers, ...memberUsers]
  const users = candidates.slice(0, limit)
  const last = users.at(-1)
  return {
    users,
    nextCursor:
      candidates.length > limit && last
        ? {
            id: last.id,
            group: staffUsers.length >= limit ? "staff" : "members",
          }
        : null,
  }
}

export async function inviteMobileAdminAccessUserForSession(input: {
  actorUserId: string
  email: string
  fullName: string
  makeDefault?: boolean | null
  role: Exclude<MembershipRole, "super_admin">
  tenantId: string
}) {
  const prisma = createPrismaClient()
  if (!prisma) {
    throw new Error(
      "Workspace invitation is unavailable without database configuration."
    )
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { cooperativeCodePrefix: true },
  })
  if (!tenant?.cooperativeCodePrefix) {
    throw ExpectedQueryError.validation(
      "Configure the cooperative prefix before inviting mobile users."
    )
  }
  const result = await provisionTenantUserRole({
    actorUserId: input.actorUserId,
    email: input.email,
    fullName: input.fullName,
    makeDefault: input.makeDefault ?? false,
    role: input.role,
    tenantId: input.tenantId,
  })
  if (!result.user.cooperativeAccessCode) {
    throw new QueryInfrastructureError("A cooperative number could not be issued.")
  }

  return {
    cooperativeNumber: result.user.cooperativeAccessCode,
    email: result.user.email,
    fullName: result.user.fullName,
    id: result.membership.id,
    role: result.membership.role,
    status: "invited" as const,
  }
}
