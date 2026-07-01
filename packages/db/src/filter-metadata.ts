import {
  dateFilter,
  inputFilter,
  optionFilter,
  type PageFilterData,
} from "@halaalvest/utils"
import { createDbRuntime } from "./runtime"
import { listTenantUsersWithMemberships } from "./queries/auth"
import { listAuditLogs } from "./queries/audit"
import { listMembers } from "./queries/members"
import { listLoans } from "./queries/loans"

const cooperativeRoles = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
  "member",
] as const

function getRoleDisplayName(role: (typeof cooperativeRoles)[number]) {
  switch (role) {
    case "super_admin":
      return "Super admin"
    case "tenant_admin":
      return "Cooperative admin"
    case "finance_officer":
      return "Finance officer"
    case "operations_officer":
      return "Operations officer"
    case "member":
      return "Member"
  }
}

function toMemberOptions(members: Array<{ fullName: string; id: string; memberNumber: string }>) {
  return members.map((member) => ({
    label: `${member.fullName} (${member.memberNumber})`,
    value: member.id,
  }))
}

function enumOption(value: string) {
  return {
    label: value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    value,
  }
}

function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }

  const value = (metadata as Record<string, unknown>)[key]

  return typeof value === "string" ? value : null
}

export async function getMemberFilterMetadata(): Promise<PageFilterData[]> {
  return [
    inputFilter("q", "Search"),
    optionFilter(
      "status",
      "Status",
      ["pending", "active", "inactive", "suspended", "exited"].map(enumOption),
    ),
    optionFilter(
      "memberType",
      "Member type",
      ["individual", "civil_servant", "business"].map(enumOption),
    ),
    optionFilter(
      "kycStatus",
      "KYC",
      ["not_started", "pending", "verified", "rejected"].map(enumOption),
    ),
    dateFilter("joinedFrom", "Joined from"),
    dateFilter("joinedTo", "Joined to"),
  ]
}

export async function getContributionFilterMetadata(
  tenantId: string,
): Promise<PageFilterData[]> {
  const runtime = createDbRuntime()
  const members =
    runtime.status === "database-configured"
      ? await listMembers(tenantId, { page: 1, pageSize: 100 }).then((result) => result.items)
      : []

  return [
    inputFilter("search", "Search"),
    optionFilter("memberId", "Member", toMemberOptions(members)),
    optionFilter("channel", "Channel", ["payroll", "transfer", "cash", "manual"]),
    dateFilter("from", "From"),
    dateFilter("to", "To"),
  ]
}

export async function getNotificationFilterMetadata(
  tenantId: string,
): Promise<PageFilterData[]> {
  const runtime = createDbRuntime()
  const logs =
    runtime.status === "database-configured"
      ? await listAuditLogs(tenantId, { action: "notification.email", limit: 100 })
      : []

  const types = Array.from(
    new Set(
      logs
        .map((log) => getMetadataString(log.metadata, "notificationType"))
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort()

  return [
    inputFilter("search", "Search"),
    optionFilter("status", "Status", ["queued", "sent", "failed"]),
    optionFilter("type", "Type", types),
  ]
}

export async function getAuditFilterMetadata(tenantId: string): Promise<PageFilterData[]> {
  const runtime = createDbRuntime()
  const logs =
    runtime.status === "database-configured"
      ? await listAuditLogs(tenantId, { limit: 200 })
      : []

  const actions = Array.from(new Set(logs.map((log) => log.action).filter(Boolean))).sort()

  return [
    inputFilter("search", "Search"),
    optionFilter("action", "Action", actions),
    dateFilter("from", "From"),
    dateFilter("to", "To"),
  ]
}

export async function getReportsFilterMetadata(): Promise<PageFilterData[]> {
  return [dateFilter("from", "From"), dateFilter("to", "To")]
}

export async function getMembershipApprovalFilterMetadata(): Promise<PageFilterData[]> {
  return [
    inputFilter("search", "Search"),
    optionFilter("status", "Status", [
      "pending_email_verification",
      "pending_approval",
      "approved",
      "rejected",
      "cancelled",
    ]),
  ]
}

export async function getRepaymentFilterMetadata(
  tenantId: string,
): Promise<PageFilterData[]> {
  const runtime = createDbRuntime()

  if (runtime.status !== "database-configured") {
    return [
      optionFilter("memberId", "Member", []),
      optionFilter("assignedToUserId", "Assignee", []),
      optionFilter("scheduleStatus", "Schedule status", [
        "pending",
        "due",
        "partially_paid",
        "overdue",
        "paid",
      ]),
      optionFilter("stage", "Case stage", [
        "active",
        "promise_tracking",
        "escalated",
        "resolved",
      ]),
      optionFilter("resolutionStatus", "Resolution", ["open", "resolved"]),
      dateFilter("from", "From"),
      dateFilter("to", "To"),
    ]
  }

  const [loans, tenantUsers] = await Promise.all([
    listLoans(tenantId),
    listTenantUsersWithMemberships(tenantId),
  ])

  const uniqueMembers = Array.from(
    new Map(loans.map((loan) => [loan.member.id, loan.member])).values(),
  )

  const assignees = tenantUsers
    .filter((user) =>
      user.memberships.some((membership) =>
        ["super_admin", "tenant_admin", "finance_officer", "operations_officer"].includes(
          membership.role,
        ),
      ),
    )
    .map((user) => ({
      label: `${user.fullName} (${user.email})`,
      value: user.id,
    }))

  return [
    optionFilter("memberId", "Member", toMemberOptions(uniqueMembers)),
    optionFilter("assignedToUserId", "Assignee", assignees),
    optionFilter("scheduleStatus", "Schedule status", [
      "pending",
      "due",
      "partially_paid",
      "overdue",
      "paid",
    ]),
    optionFilter("stage", "Case stage", [
      "active",
      "promise_tracking",
      "escalated",
      "resolved",
    ]),
    optionFilter("resolutionStatus", "Resolution", ["open", "resolved"]),
    dateFilter("from", "From"),
    dateFilter("to", "To"),
  ]
}

export async function getRoleFilterMetadata(): Promise<PageFilterData[]> {
  return [
    optionFilter(
      "role",
      "Role",
      cooperativeRoles.map((role) => ({
        label: getRoleDisplayName(role),
        value: role,
      })),
    ),
  ]
}
