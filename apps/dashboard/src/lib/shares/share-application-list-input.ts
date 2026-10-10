import type {
  MemberShareApplicationSortField,
  MemberShareApplicationStatus,
} from "@halaalvest/db"

export type ShareApplicationListFilter = {
  shareApplicationQ: string | null
  shareApplicationStatus: string | null
}

const statuses = new Set<MemberShareApplicationStatus>([
  "approved",
  "cancelled",
  "pending",
  "rejected",
])

const sortFields: Record<string, MemberShareApplicationSortField> = {
  application: "memberName",
  createdAt: "createdAt",
  memberName: "memberName",
  requestedAt: "createdAt",
  requestedUnits: "requestedUnits",
  reviewedAt: "reviewedAt",
  shareValueSnapshot: "shareValueSnapshot",
  status: "status",
  units: "requestedUnits",
  value: "shareValueSnapshot",
}

export function getShareApplicationSort(
  sort?: string[] | null
): [MemberShareApplicationSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sortFields[sort[0] ?? ""]
  const direction = sort[1]

  if (!field || (direction !== "asc" && direction !== "desc")) {
    return null
  }

  return [field, direction]
}

export function getShareApplicationListInput({
  filter,
  search = filter.shareApplicationQ,
  sort,
}: {
  filter: ShareApplicationListFilter
  search?: string | null
  sort?: string[] | null
}) {
  const q = search?.trim()

  return {
    q: q || undefined,
    sort: getShareApplicationSort(sort),
    status: statuses.has(
      filter.shareApplicationStatus as MemberShareApplicationStatus
    )
      ? (filter.shareApplicationStatus as MemberShareApplicationStatus)
      : undefined,
  }
}
