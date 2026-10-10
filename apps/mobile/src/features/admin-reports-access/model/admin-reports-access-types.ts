import type { MobileReadCacheState } from "@/lib/read-cache"

export type AdminReportsQaState =
  | "denied"
  | "empty"
  | "error"
  | "loading"
  | "offline"
  | "stale"

export type MobileMetricFormat = "count" | "currency" | "percent"

export type AdminReportKey =
  | "members"
  | "memberStatements"
  | "contributions"
  | "specialSavings"
  | "charges"
  | "financing"
  | "repayments"
  | "paymentReceipts"
  | "procurement"
  | "foodPurchase"
  | "projectFinancing"
  | "shares"
  | "profit"
  | "support"
  | "openingBalances"
  | "audit"

export type AdminReportCard = {
  available: boolean
  category: "finance" | "governance" | "members" | "operations"
  detail: string
  key: AdminReportKey
  metricFormat: MobileMetricFormat
  metricLabel: string
  metricValue: number
  rowLimit: number
  title: string
}

export type AdminReportFilters = {
  fromDate: string | null
  toDate: string | null
}

export type AdminReportActivityFilters = AdminReportFilters & {
  action: string | null
  entityType: string | null
  search: string | null
}

export type AdminActivityEvent = {
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
}

export type AdminCollectionFollowUp = {
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
}

export type AdminReportActivityPage = {
  items: AdminActivityEvent[]
  nextCursor: string | null
}

export type AdminGeneratedReportPayload = {
  content: string
  expiresAt: string
  filename: string
  generatedAt: string
  id: string
  key: AdminReportKey
  mimeType: "text/csv"
  rowCount: number
}

export type AdminReports = {
  activityEvents: AdminActivityEvent[]
  cache?: MobileReadCacheState
  collectionFollowUps: AdminCollectionFollowUp[]
  generatedAt: string
  reports: AdminReportCard[]
  stats: {
    detail: string
    format: MobileMetricFormat
    key: string
    label: string
    value: number
  }[]
}

export type AdminAccessRoleKey =
  | "super_admin"
  | "tenant_admin"
  | "finance_officer"
  | "operations_officer"
  | "member"

export type AdminAccess = {
  cache?: MobileReadCacheState
  generatedAt: string
  roles: {
    defaultUsersCount: number
    label: string
    role: AdminAccessRoleKey
    scope: string
    usersCount: number
  }[]
  summary: {
    defaultRoles: number
    memberUsers: number
    roleAssignments: number
    staffUsers: number
    workspaceUsers: number
  }
  users: {
    defaultRoleLabel: string | null
    email: string
    fullName: string
    id: string
    isPlatformOwner: boolean
    memberships: {
      id: string
      isDefault: boolean
      label: string
      role: AdminAccessRoleKey
    }[]
  }[]
}

export type AdminAccessInviteInput = {
  email: string
  fullName: string
  makeDefault?: boolean
  role: Exclude<AdminAccessRoleKey, "super_admin">
}

export type AdminAccessInviteResult = {
  cooperativeNumber: string
  deliveryStatus:
    | "development_fixture"
    | "failed"
    | "queued"
    | "sent"
    | "unknown"
  email: string
  fullName: string
  id: string
  role: AdminAccessInviteInput["role"]
  setupUrl: string
  status: "invited"
}
