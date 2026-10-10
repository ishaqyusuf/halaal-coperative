import { QueryInfrastructureError } from "../query-error"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import {
  getMobileReportCatalog,
  type MobileReportKey,
} from "@halaalvest/domain/mobile-reports"
import type { SubscriptionEntitlements } from "@halaalvest/domain/subscriptions"
import { listActivityReportEvents } from "./audit"
import {
  listTenantUsersWithMemberships,
  provisionTenantUserRole,
  type MembershipRole,
} from "./auth"
import { getDashboardMetrics, getOverviewSummary } from "./dashboard"
import { listCollectionFollowUps } from "./loans"

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

function buildReportCards(
  metrics: Awaited<ReturnType<typeof getDashboardMetrics>>,
  summary: Awaited<ReturnType<typeof getOverviewSummary>>,
  entitlements: SubscriptionEntitlements,
): MobileFeatureAdminReportCard[] {
  return getMobileReportCatalog(entitlements).map((report) => {
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
  entitlements: SubscriptionEntitlements,
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

  const [summary, metrics, activityEvents, collectionFollowUps] =
    await Promise.all([
      getOverviewSummary(tenantId, prisma),
      getDashboardMetrics(tenantId, prisma),
      listActivityReportEvents(tenantId, { limit: 8 }, prisma),
      listCollectionFollowUps(tenantId, { limit: 8 }, prisma),
    ])
  const reports = buildReportCards(metrics, summary, entitlements)

  return {
    activityEvents: activityEvents.map((event) => ({
      action: event.action,
      actionLabel: event.actionLabel,
      actorLabel: event.actorLabel,
      actorType: event.actorType,
      authorizationRole: event.authorizationRole,
      authorizerLabel: event.authorizerLabel,
      entityId: event.entityId,
      entityType: event.entityType,
      id: event.id,
      metadataSummary: event.metadataSummary.slice(0, 3),
      occurredAt: event.occurredAt.toISOString(),
    })),
    collectionFollowUps: collectionFollowUps.map((followUp) => ({
      caseStage: followUp.caseStage,
      createdAt: followUp.createdAt.toISOString(),
      id: followUp.id,
      loanProductName: followUp.loan.loanProduct.name,
      memberName: followUp.member.fullName,
      memberNumber: followUp.member.memberNumber,
      nextActionAt: followUp.nextActionAt?.toISOString() ?? null,
      note: followUp.note,
      priority: followUp.priority,
      repaymentScheduleItemId: followUp.repaymentScheduleItemId,
      resolutionStatus: followUp.resolutionStatus,
      status: followUp.status,
    })),
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
        value: metrics.activeMemberCount,
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
