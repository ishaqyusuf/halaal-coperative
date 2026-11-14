import {
  dateRangeFilter,
  inputFilter,
  optionFilter,
  type PageFilterData,
  type PageFilterOption,
} from "@halaalvest/utils"
import { createDbRuntime } from "./runtime"
import { listTenantUsersWithRoles } from "./queries/auth"
import { activityAreaLabels, activityAreas } from "./queries/activity-words"
import { listAuditLogs } from "./queries/audit"
import { listMembers } from "./queries/members"
import { listLoanBorrowerOptions } from "./queries/loan-views"

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

function toMemberOptions(
  members: Array<{ fullName: string; id: string; memberNumber: string }>
) {
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
      ["pending", "active", "inactive", "suspended", "exited"].map(enumOption)
    ),
    optionFilter(
      "memberType",
      "Member type",
      ["individual", "civil_servant", "business"].map(enumOption)
    ),
    optionFilter(
      "kycStatus",
      "KYC",
      ["not_started", "pending", "verified", "rejected"].map(enumOption)
    ),
    dateRangeFilter("dateRange", "Joined date"),
  ]
}

export async function getContributionFilterMetadata(
  tenantId: string
): Promise<PageFilterData[]> {
  const runtime = createDbRuntime()
  const members =
    runtime.status === "database-configured"
      ? await listMembers(tenantId, { page: 1, pageSize: 100 }).then(
          (result) => result.items
        )
      : []

  return [
    inputFilter("search", "Search"),
    optionFilter("memberId", "Member", toMemberOptions(members)),
    optionFilter("channel", "Channel", [
      "payroll",
      "transfer",
      "cash",
      "manual",
    ]),
    dateRangeFilter("dateRange", "Contribution date"),
  ]
}

export async function getNotificationFilterMetadata(
  tenantId: string
): Promise<PageFilterData[]> {
  const runtime = createDbRuntime()
  const logs =
    runtime.status === "database-configured"
      ? await listAuditLogs(tenantId, {
          action: "notification.email",
          limit: 100,
        })
      : []

  const types = Array.from(
    new Set(
      logs
        .map((log) => getMetadataString(log.metadata, "notificationType"))
        .filter((value): value is string => Boolean(value))
    )
  ).sort()

  return [
    inputFilter("search", "Search"),
    optionFilter("status", "Status", ["queued", "sent", "failed"]),
    optionFilter("type", "Type", types),
  ]
}

/** Activity log filters: plain areas, no database read. */
export async function getAuditFilterMetadata(): Promise<PageFilterData[]> {
  return [
    inputFilter("search", "Search"),
    optionFilter(
      "area",
      "What happened",
      activityAreas.map((area) => ({
        label: activityAreaLabels[area],
        value: area,
      }))
    ),
    dateRangeFilter("dateRange", "Date"),
  ]
}

export async function getReportsFilterMetadata(): Promise<PageFilterData[]> {
  return [dateRangeFilter("dateRange", "Reporting period")]
}

export async function getMembershipApprovalFilterMetadata(): Promise<
  PageFilterData[]
> {
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

const repaymentScheduleStatusOptions = [
  { label: "Not due yet", value: "pending" },
  { label: "Due", value: "due" },
  { label: "Part paid", value: "partially_paid" },
  { label: "Late", value: "overdue" },
  { label: "Paid", value: "paid" },
]
const collectionStageOptions = [
  { label: "Being followed up", value: "active" },
  { label: "Promised to pay", value: "promise_tracking" },
  { label: "Needs a senior", value: "escalated" },
  { label: "Sorted out", value: "resolved" },
]
const collectionResolutionOptions = [
  { label: "Still open", value: "open" },
  { label: "Sorted out", value: "resolved" },
]

function repaymentFilters(
  members: PageFilterOption[],
  assignees: PageFilterOption[]
): PageFilterData[] {
  return [
    optionFilter("memberId", "Member", members),
    optionFilter("assignedToUserId", "Who follows up", assignees),
    optionFilter("scheduleStatus", "Status", repaymentScheduleStatusOptions),
    optionFilter("stage", "Follow-up", collectionStageOptions),
    optionFilter(
      "resolutionStatus",
      "Open or sorted",
      collectionResolutionOptions
    ),
    dateRangeFilter("dateRange", "Due date"),
  ]
}

export async function getRepaymentFilterMetadata(
  tenantId: string
): Promise<PageFilterData[]> {
  const runtime = createDbRuntime()

  if (runtime.status !== "database-configured") {
    return repaymentFilters([], [])
  }

  // Lean: members who have a loan (labels only) and staff who can follow up.
  // Previously every loan with product, request and schedule plus every
  // tenant user with memberships was loaded to build these two lists.
  const [borrowers, staffUsers] = await Promise.all([
    listLoanBorrowerOptions(tenantId),
    listTenantUsersWithRoles(tenantId, [
      "super_admin",
      "tenant_admin",
      "finance_officer",
      "operations_officer",
    ]),
  ])

  return repaymentFilters(
    toMemberOptions(borrowers),
    staffUsers.map((user) => ({ label: user.fullName, value: user.id }))
  )
}

export async function getRoleFilterMetadata(): Promise<PageFilterData[]> {
  return [
    optionFilter(
      "role",
      "Role",
      cooperativeRoles.map((role) => ({
        label: getRoleDisplayName(role),
        value: role,
      }))
    ),
  ]
}
