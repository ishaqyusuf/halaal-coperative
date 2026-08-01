export type MemberStatusFilter =
  | "pending"
  | "active"
  | "inactive"
  | "suspended"
  | "exited"

export type MemberTypeFilter = "individual" | "civil_servant" | "business"

export type KycStatusFilter =
  | "not_started"
  | "pending"
  | "verified"
  | "rejected"

export type MigrationStatusFilter = "pending" | "finalized"

export type FilterItem<T extends string> = {
  id: T
  name: string
}

export const memberStatusFilters: FilterItem<MemberStatusFilter>[] = [
  { id: "pending", name: "Pending" },
  { id: "active", name: "Active" },
  { id: "inactive", name: "Inactive" },
  { id: "suspended", name: "Suspended" },
  { id: "exited", name: "Exited" },
]

export const memberTypeFilters: FilterItem<MemberTypeFilter>[] = [
  { id: "individual", name: "Individual" },
  { id: "civil_servant", name: "Civil servant" },
  { id: "business", name: "Business" },
]

export const kycStatusFilters: FilterItem<KycStatusFilter>[] = [
  { id: "not_started", name: "Not started" },
  { id: "pending", name: "Pending" },
  { id: "verified", name: "Verified" },
  { id: "rejected", name: "Rejected" },
]

export function getMigrationStatusFilters(label: string) {
  return [
    { id: "pending", name: `${label} pending` },
    { id: "finalized", name: `${label} finalized` },
  ] satisfies FilterItem<MigrationStatusFilter>[]
}

export const memberSortOptions = [
  { id: "joinedAt,desc", name: "Newest joined" },
  { id: "joinedAt,asc", name: "Oldest joined" },
  { id: "fullName,asc", name: "Name A–Z" },
  { id: "fullName,desc", name: "Name Z–A" },
  { id: "status,asc", name: "Member status" },
  { id: "kycStatus,asc", name: "KYC status" },
] as const
