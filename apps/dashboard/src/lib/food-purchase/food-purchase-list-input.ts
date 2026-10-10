import type { FoodPurchaseApplicationSortField } from "@halaalvest/db"

export type FoodPurchaseFilterParams = {
  q: string | null
  status: string | null
}

type FoodPurchaseStatus =
  | "approved"
  | "cancelled"
  | "rejected"
  | "submitted"
  | "under_review"

const statuses = new Set<FoodPurchaseStatus>([
  "approved",
  "cancelled",
  "rejected",
  "submitted",
  "under_review",
])

const sortFields: Record<string, FoodPurchaseApplicationSortField> = {
  application: "memberName",
  approved: "approvedAmount",
  approvedAmount: "approvedAmount",
  item: "itemDescription",
  itemDescription: "itemDescription",
  paidAmount: "paidAmount",
  payment: "paidAmount",
  requested: "requestedAmount",
  requestedAmount: "requestedAmount",
  requestedAt: "requestedAt",
  status: "status",
}

export function getFoodPurchaseSort(sort?: string[] | null) {
  if (!sort || sort.length !== 2) return null

  const field = sortFields[sort[0] ?? ""]
  const direction = sort[1]

  return field && (direction === "asc" || direction === "desc")
    ? ([field, direction] as [FoodPurchaseApplicationSortField, "asc" | "desc"])
    : null
}

export function getFoodPurchaseListInput(
  filters: FoodPurchaseFilterParams,
  sort?: string[] | null,
  search = filters.q
) {
  return {
    q: search || undefined,
    sort: getFoodPurchaseSort(sort),
    status: statuses.has(filters.status as FoodPurchaseStatus)
      ? (filters.status as FoodPurchaseStatus)
      : undefined,
  }
}
