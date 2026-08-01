import type { MembersFilterParams } from "@/hooks/use-members-filter-params"
import { getEnumValue } from "@/utils/enum"

export type MembersSortField =
  | "fullName"
  | "memberNumber"
  | "memberType"
  | "status"
  | "kycStatus"
  | "joinedAt"

export function getMembersSort(
  sort?: string[] | null
): [MembersSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const [field, direction] = sort
  const validFields = new Set<string>([
    "fullName",
    "memberNumber",
    "memberType",
    "status",
    "kycStatus",
    "joinedAt",
  ])

  if (!field || !validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as MembersSortField, direction]
}

export function getMembersListInput(
  filters: MembersFilterParams,
  sort?: string[] | null,
  search = filters.q
) {
  return {
    joinedFrom: filters.joinedFrom ?? undefined,
    joinedTo: filters.joinedTo ?? undefined,
    kycStatus: getEnumValue(filters.kycStatus, [
      "not_started",
      "pending",
      "verified",
      "rejected",
    ] as const),
    memberType: getEnumValue(filters.memberType, [
      "civil_servant",
      "individual",
      "business",
    ] as const),
    migrationStatus: getEnumValue(filters.migrationStatus, [
      "pending",
      "finalized",
    ] as const),
    q: search ?? undefined,
    sort: getMembersSort(sort),
    status: getEnumValue(filters.status, [
      "pending",
      "active",
      "inactive",
      "suspended",
      "exited",
    ] as const),
  }
}
