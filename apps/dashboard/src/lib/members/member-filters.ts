import {
  getDatePresetLabel,
  isDateFilterPreset,
  resolveDateFilter,
} from "@halaalvest/utils"
import { hasActiveFilters } from "@/lib/filters/utils"
import type { MembersFilterParams } from "@/hooks/use-members-filter-params"

export type MemberFilterValues = MembersFilterParams

type MemberStatus = "pending" | "active" | "inactive" | "suspended" | "exited"
type MemberType = "individual" | "civil_servant" | "business"
type KycStatus = "not_started" | "pending" | "verified" | "rejected"
type MemberMigrationStatus = "pending" | "finalized"

function displayEnum(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function toMemberQueryFilters(filters: MembersFilterParams) {
  const dateRange = resolveDateFilter(filters.dateRange)
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

  const normalizedMigrationStatus =
    filters.migrationStatus === "pending" ||
    filters.migrationStatus === "finalized"
      ? (filters.migrationStatus as MemberMigrationStatus)
      : undefined

  return {
    joinedFrom: dateRange?.from
      ? new Date(`${dateRange.from}T00:00:00.000Z`)
      : undefined,
    joinedTo: dateRange?.to
      ? new Date(`${dateRange.to}T23:59:59.999Z`)
      : undefined,
    kycStatus: normalizedKycStatus,
    memberType: normalizedMemberType,
    migrationStatus: normalizedMigrationStatus,
    search: filters.q ?? undefined,
    status: normalizedStatus,
  }
}

export function hasActiveMemberFilters(filters: MembersFilterParams) {
  return hasActiveFilters(filters, { ignoreKeys: ["q"] })
}

export function getActiveMemberFilters(filters: MembersFilterParams) {
  const activeFilters: Array<{ key: string; label: string }> = []

  if (filters.status) {
    activeFilters.push({
      key: "status",
      label: `Status: ${displayEnum(filters.status)}`,
    })
  }

  if (filters.memberType) {
    activeFilters.push({
      key: "memberType",
      label: `Type: ${displayEnum(filters.memberType)}`,
    })
  }

  if (filters.kycStatus) {
    activeFilters.push({
      key: "kycStatus",
      label: `KYC: ${displayEnum(filters.kycStatus)}`,
    })
  }

  if (filters.migrationStatus) {
    activeFilters.push({
      key: "migrationStatus",
      label: `Migration: ${displayEnum(filters.migrationStatus)}`,
    })
  }

  if (filters.dateRange?.length) {
    const [first] = filters.dateRange
    const dateRange = resolveDateFilter(filters.dateRange)
    const label =
      filters.dateRange.length === 1 && first && isDateFilterPreset(first)
        ? getDatePresetLabel(first)
        : [dateRange?.from, dateRange?.to].filter(Boolean).join(" - ")

    activeFilters.push({
      key: "dateRange",
      label: `Joined: ${label}`,
    })
  }

  return activeFilters
}

export function buildMembersPath(
  filters: MemberFilterValues,
  pathname = "/members"
) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === "string" && value.length > 0) {
      params.set(key, value)
    } else if (Array.isArray(value) && value.length > 0) {
      params.set(key, value.join(","))
    }
  })

  const search = params.toString()
  return search ? `${pathname}?${search}` : pathname
}
