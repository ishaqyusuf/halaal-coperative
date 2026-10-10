import type {
  ProcurementRequestSortField,
  ProcurementRequestStatus,
} from "@halaalvest/db"

export type ProcurementFilterParams = {
  q: string | null
  status: string | null
}

const statuses = new Set<ProcurementRequestStatus>([
  "active",
  "approved",
  "cancelled",
  "completed",
  "purchased",
  "rejected",
  "submitted",
  "under_review",
])

const sortFields: Record<string, ProcurementRequestSortField> = {
  approved: "approvedCost",
  approvedCost: "approvedCost",
  estimatedMonthlyRepayment: "estimatedMonthlyRepayment",
  itemName: "itemName",
  monthly: "estimatedMonthlyRepayment",
  request: "itemName",
  requested: "requestedCost",
  requestedAt: "requestedAt",
  requestedCost: "requestedCost",
  vendor: "vendorName",
  vendorName: "vendorName",
}

export function getProcurementSort(sort?: string[] | null) {
  if (!sort || sort.length !== 2) return null

  const field = sortFields[sort[0] ?? ""]
  const direction = sort[1]

  return field && (direction === "asc" || direction === "desc")
    ? ([field, direction] as [ProcurementRequestSortField, "asc" | "desc"])
    : null
}

export function getProcurementListInput(
  filters: ProcurementFilterParams,
  sort?: string[] | null,
  search = filters.q
) {
  return {
    q: search || undefined,
    sort: getProcurementSort(sort),
    status: statuses.has(filters.status as ProcurementRequestStatus)
      ? (filters.status as ProcurementRequestStatus)
      : undefined,
  }
}
