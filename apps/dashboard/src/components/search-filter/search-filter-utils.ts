import {
  getDatePresetLabel,
  isDateFilterPreset,
  resolveDateFilter,
  type PageFilterData,
} from "@halaalvest/utils"
import type { SearchFilterValue } from "./types"

const fallbackLabels: Record<string, string> = {
  assignedToUserId: "Assignee",
  channel: "Channel",
  kycStatus: "KYC",
  memberId: "Member",
  memberType: "Member type",
  q: "Search",
  resolutionStatus: "Resolution",
  scheduleStatus: "Schedule status",
  search: "Search",
  stage: "Case stage",
  status: "Status",
  type: "Type",
}

export function isSearchKey(key: string) {
  return key === "q" || key === "search"
}

export function getSearchKeyFromSchema(
  filterSchema?: Partial<Record<string, unknown>>
) {
  const keys = Object.keys(filterSchema ?? {})
  return keys.find(isSearchKey) ?? null
}

export function getFilterName(filterList: PageFilterData[], key: string) {
  return (
    filterList.find((item) => item.value === key)?.label ??
    fallbackLabels[key] ??
    key
  )
}

export function getFilterValueLabel(
  filterList: PageFilterData[],
  key: string,
  value: SearchFilterValue
) {
  if (value == null || value === "") {
    return null
  }

  const filter = filterList.find((item) => item.value === key)

  if (filter?.type === "date-range") {
    return formatDateFilterValue(value)
  }

  if (!filter?.options?.length) {
    return Array.isArray(value) ? value.join(" - ") : String(value)
  }

  if (Array.isArray(value)) {
    return value
      .map(
        (item) =>
          filter.options?.find((option) => option.value === item)?.label ?? item
      )
      .join(", ")
  }

  return (
    filter.options.find((option) => option.value === value)?.label ??
    String(value)
  )
}

export function formatDateFilterValue(value: SearchFilterValue) {
  const values = Array.isArray(value) ? value : value ? [value] : []
  const first = values[0]

  if (values.length === 1 && first && isDateFilterPreset(first)) {
    return getDatePresetLabel(first)
  }

  const resolved = resolveDateFilter(values)

  if (!resolved) {
    return values.filter((item) => item && item !== "-").join(" - ") || null
  }

  if (resolved.from && resolved.to) {
    return `${formatFilterDate(resolved.from)} - ${formatFilterDate(resolved.to)}`
  }

  if (resolved.from) {
    return `From ${formatFilterDate(resolved.from)}`
  }

  if (resolved.to) {
    return `Through ${formatFilterDate(resolved.to)}`
  }

  return null
}

function formatFilterDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1))

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date)
}

export function hasFilterValue(value: SearchFilterValue) {
  if (value == null || value === "") {
    return false
  }

  return !Array.isArray(value) || value.length > 0
}
