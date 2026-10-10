import type {
  ProjectFinancingRequestSortField,
  ProjectFinancingRequestStatus,
} from "@halaalvest/db"

export type ProjectFinancingFilterParams = {
  q: string | null
  status: string | null
}

type ProjectFinancingListSortField = Exclude<
  ProjectFinancingRequestSortField,
  "status"
>

const statuses = new Set<ProjectFinancingRequestStatus>([
  "active",
  "approved",
  "cancelled",
  "completed",
  "rejected",
  "submitted",
  "under_review",
])

const sortFields: Record<string, ProjectFinancingListSortField> = {
  approved: "approvedAmount",
  approvedAmount: "approvedAmount",
  businessName: "businessName",
  disbursed: "disbursedAt",
  disbursedAt: "disbursedAt",
  estimatedMonthlyPayback: "estimatedMonthlyPayback",
  member: "memberName",
  memberName: "memberName",
  monthly: "estimatedMonthlyPayback",
  request: "businessName",
  requested: "requestedAmount",
  requestedAmount: "requestedAmount",
  requestedAt: "requestedAt",
}

export function getProjectFinancingSort(sort?: string[] | null) {
  if (!sort || sort.length !== 2) return null

  const field = sortFields[sort[0] ?? ""]
  const direction = sort[1]

  return field && (direction === "asc" || direction === "desc")
    ? ([field, direction] as [
        ProjectFinancingListSortField,
        "asc" | "desc",
      ])
    : null
}

export function getProjectFinancingListInput(
  filters: ProjectFinancingFilterParams,
  sort?: string[] | null,
  search = filters.q
) {
  return {
    q: search || undefined,
    sort: getProjectFinancingSort(sort),
    status: statuses.has(filters.status as ProjectFinancingRequestStatus)
      ? (filters.status as ProjectFinancingRequestStatus)
      : undefined,
  }
}
