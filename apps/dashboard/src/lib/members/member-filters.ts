type MemberStatus = "pending" | "active" | "inactive" | "suspended" | "exited"
type MemberType = "individual" | "civil_servant" | "business"
type KycStatus = "not_started" | "pending" | "verified" | "rejected"

export type MemberFilterValues = {
  joinedFrom: string
  joinedTo: string
  kycStatus: string
  memberType: string
  search: string
  status: string
}

export function buildMembersPath(
  filters: MemberFilterValues,
  pathname = "/members",
) {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.status) params.set("status", filters.status)
  if (filters.memberType) params.set("memberType", filters.memberType)
  if (filters.kycStatus) params.set("kycStatus", filters.kycStatus)
  if (filters.joinedFrom) params.set("joinedFrom", filters.joinedFrom)
  if (filters.joinedTo) params.set("joinedTo", filters.joinedTo)

  const query = params.toString()

  return query ? `${pathname}?${query}` : pathname
}

export function getMemberFilterValues(
  params: Record<string, string | string[] | undefined>,
): MemberFilterValues {
  return {
    joinedFrom: typeof params.joinedFrom === "string" ? params.joinedFrom : "",
    joinedTo: typeof params.joinedTo === "string" ? params.joinedTo : "",
    kycStatus: typeof params.kycStatus === "string" ? params.kycStatus : "",
    memberType: typeof params.memberType === "string" ? params.memberType : "",
    search: typeof params.search === "string" ? params.search : "",
    status: typeof params.status === "string" ? params.status : "",
  }
}

export function toMemberQueryFilters(filters: MemberFilterValues) {
  const normalizedStatus =
    filters.status === "pending" ||
    filters.status === "active" ||
    filters.status === "inactive" ||
    filters.status === "suspended" ||
    filters.status === "exited"
      ? (filters.status as MemberStatus)
      : undefined

  const normalizedMemberType =
    filters.memberType === "individual" ||
    filters.memberType === "civil_servant" ||
    filters.memberType === "business"
      ? (filters.memberType as MemberType)
      : undefined

  const normalizedKycStatus =
    filters.kycStatus === "not_started" ||
    filters.kycStatus === "pending" ||
    filters.kycStatus === "verified" ||
    filters.kycStatus === "rejected"
      ? (filters.kycStatus as KycStatus)
      : undefined

  return {
    joinedFrom: filters.joinedFrom ? new Date(`${filters.joinedFrom}T00:00:00.000Z`) : undefined,
    joinedTo: filters.joinedTo ? new Date(`${filters.joinedTo}T23:59:59.999Z`) : undefined,
    kycStatus: normalizedKycStatus,
    memberType: normalizedMemberType,
    search: filters.search || undefined,
    status: normalizedStatus,
  }
}

export function getActiveMemberFilterChips(filters: MemberFilterValues) {
  return [
    filters.search ? { key: "search", label: `Search: ${filters.search}` } : null,
    filters.status ? { key: "status", label: `Status: ${filters.status.replace(/_/g, " ")}` } : null,
    filters.memberType
      ? { key: "memberType", label: `Type: ${filters.memberType.replace(/_/g, " ")}` }
      : null,
    filters.kycStatus
      ? { key: "kycStatus", label: `KYC: ${filters.kycStatus.replace(/_/g, " ")}` }
      : null,
    filters.joinedFrom ? { key: "joinedFrom", label: `From: ${filters.joinedFrom}` } : null,
    filters.joinedTo ? { key: "joinedTo", label: `To: ${filters.joinedTo}` } : null,
  ].filter((value): value is { key: string; label: string } => Boolean(value))
}
