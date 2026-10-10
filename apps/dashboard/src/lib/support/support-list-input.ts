import type {
  SupportCaseCategory,
  SupportCasePriority,
  SupportCaseSortField,
  SupportCaseStatus,
} from "@halaalvest/db"

export type SupportFilterParams = {
  assignedToUserId: string | null
  category: string | null
  priority: string | null
  q: string | null
  status: string | null
}

const categories = new Set<SupportCaseCategory>([
  "payment_issue",
  "account_update",
  "shares",
  "financing",
  "procurement",
  "feature_request",
  "technical",
  "other",
])
const priorities = new Set<SupportCasePriority>([
  "high",
  "low",
  "normal",
  "urgent",
])
const statuses = new Set<SupportCaseStatus>([
  "closed",
  "in_progress",
  "open",
  "resolved",
  "waiting_on_member",
])
const sortFields = new Set<SupportCaseSortField>([
  "assignedToUser",
  "category",
  "createdAt",
  "latestReply",
  "linkedRecord",
  "priority",
  "status",
  "subject",
  "updatedAt",
])

function optionalChoice<T extends string>(value: string | null, set: Set<T>) {
  return set.has(value as T) ? (value as T) : undefined
}

function optionalUuid(value: string | null) {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
    ? value
    : undefined
}

function getSupportSort(
  sort?: string[] | null
): [SupportCaseSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const fieldMap: Record<string, SupportCaseSortField> = {
    assignedToUser: "assignedToUser",
    assignee: "assignedToUser",
    case: "subject",
    category: "category",
    createdAt: "createdAt",
    latestReply: "latestReply",
    linkedRecord: "linkedRecord",
    priority: "priority",
    status: "status",
    subject: "subject",
    updatedAt: "updatedAt",
  }
  const field = fieldMap[sort[0] ?? ""]
  const direction = sort[1]

  if (!field || !sortFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field, direction]
}

export function getSupportListInput(
  filters: SupportFilterParams,
  sort?: string[] | null,
  search = filters.q,
  includeStaffFilters = true
) {
  return {
    assignedToUserId:
      includeStaffFilters ? optionalUuid(filters.assignedToUserId) : undefined,
    category: includeStaffFilters
      ? optionalChoice(filters.category, categories)
      : undefined,
    priority: optionalChoice(filters.priority, priorities),
    q: search || undefined,
    sort: getSupportSort(sort),
    status: optionalChoice(filters.status, statuses),
  }
}
