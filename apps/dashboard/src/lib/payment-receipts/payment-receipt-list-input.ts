import type { MemberPaymentReceiptSortField } from "@halaalvest/db"

type MemberPaymentReceiptStatus =
  | "approved"
  | "correction_requested"
  | "rejected"
  | "submitted"
  | "under_review"

export type PaymentReceiptFilterParams = {
  q: string | null
  status: string | null
}

const receiptStatuses = new Set<MemberPaymentReceiptStatus>([
  "approved",
  "correction_requested",
  "rejected",
  "submitted",
  "under_review",
])

const sortFieldMap: Record<string, MemberPaymentReceiptSortField> = {
  amount: "totalAmount",
  paidAt: "paidAt",
  receipt: "memberName",
  reference: "paymentReference",
  status: "status",
  submittedAt: "submittedAt",
  totalAmount: "totalAmount",
}

export function getPaymentReceiptSort(
  sort?: string[] | null
): [MemberPaymentReceiptSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sortFieldMap[sort[0] ?? ""]
  const direction = sort[1]

  if (!field || (direction !== "asc" && direction !== "desc")) return null

  return [field, direction]
}

export function getPaymentReceiptListInput(
  filter: PaymentReceiptFilterParams,
  sort?: string[] | null,
  search = filter.q
) {
  return {
    q: search || undefined,
    sort: getPaymentReceiptSort(sort),
    status: receiptStatuses.has(filter.status as MemberPaymentReceiptStatus)
      ? (filter.status as MemberPaymentReceiptStatus)
      : undefined,
  }
}
