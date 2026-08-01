import type { MembershipApprovalsFilterParams } from "@/hooks/use-membership-approvals-filter-params"
import { getEnumValue } from "@/utils/enum"

export type MembershipApprovalSortField =
  | "emailVerifiedAt"
  | "fullName"
  | "memberNumber"
  | "phoneNumber"
  | "status"
  | "submittedAt"

export function getMembershipApprovalSort(
  sort?: string[] | null
): [MembershipApprovalSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const [field, direction] = sort
  const validFields = new Set<string>([
    "emailVerifiedAt",
    "fullName",
    "memberNumber",
    "phoneNumber",
    "status",
    "submittedAt",
  ])

  if (!field || !validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as MembershipApprovalSortField, direction]
}

export function getMembershipApprovalsListInput(
  filters: MembershipApprovalsFilterParams,
  sort?: string[] | null,
  search = filters.search
) {
  return {
    q: search ?? undefined,
    sort: getMembershipApprovalSort(sort),
    status: getEnumValue(filters.status, [
      "approved",
      "cancelled",
      "pending_approval",
      "pending_email_verification",
      "rejected",
    ] as const),
  }
}
