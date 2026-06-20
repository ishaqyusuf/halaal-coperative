import type { PageFilterData } from "@halaalvest/utils"
import type { SearchFilterValue } from "./types"

const fallbackLabels: Record<string, string> = {
  assignedToUserId: "Assignee",
  channel: "Channel",
  from: "From",
  joinedFrom: "Joined from",
  joinedTo: "Joined to",
  kycStatus: "KYC",
  memberId: "Member",
  memberType: "Member type",
  q: "Search",
  resolutionStatus: "Resolution",
  scheduleStatus: "Schedule status",
  search: "Search",
  stage: "Case stage",
  status: "Status",
  to: "To",
  type: "Type",
}

export function isSearchKey(key: string) {
  return key === "q" || key === "search"
}

export function getSearchKeyFromSchema(filterSchema?: Partial<Record<string, unknown>>) {
  const keys = Object.keys(filterSchema ?? {})
  return keys.find(isSearchKey) ?? null
}

export function getFilterName(filterList: PageFilterData[], key: string) {
  return filterList.find((item) => item.value === key)?.label ?? fallbackLabels[key] ?? key
}

export function getFilterValueLabel(
  filterList: PageFilterData[],
  key: string,
  value: SearchFilterValue,
) {
  if (value == null || value === "") {
    return null
  }

  const filter = filterList.find((item) => item.value === key)

  if (!filter?.options?.length) {
    return Array.isArray(value) ? value.join(" - ") : String(value)
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => filter.options?.find((option) => option.value === item)?.label ?? item)
      .join(", ")
  }

  return filter.options.find((option) => option.value === value)?.label ?? String(value)
}

export function hasFilterValue(value: SearchFilterValue) {
  if (value == null || value === "") {
    return false
  }

  return !Array.isArray(value) || value.length > 0
}
