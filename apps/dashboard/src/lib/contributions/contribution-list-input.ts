import { resolveDateFilter } from "@halaalvest/utils"
import type { ContributionsFilterParams } from "@/hooks/use-contributions-filter-params"

export type ContributionLedgerSortField =
  | "amount"
  | "committedAmount"
  | "extraSavingsAmount"
  | "memberName"
  | "postedAt"

type ContributionChannel = "cash" | "manual" | "payroll" | "transfer"

const contributionChannels = new Set<ContributionChannel>([
  "cash",
  "manual",
  "payroll",
  "transfer",
])

const contributionSortFields = new Set<ContributionLedgerSortField>([
  "amount",
  "committedAmount",
  "extraSavingsAmount",
  "memberName",
  "postedAt",
])

function normalizeSort(
  sort: string[] | null | undefined
): [ContributionLedgerSortField, "asc" | "desc"] | undefined {
  if (!sort || sort.length !== 2) return undefined

  const [field, direction] = sort
  if (
    !field ||
    !contributionSortFields.has(field as ContributionLedgerSortField)
  ) {
    return undefined
  }
  if (direction !== "asc" && direction !== "desc") return undefined

  return [field as ContributionLedgerSortField, direction]
}

function normalizeSearch(search: string | null | undefined) {
  const value = search?.trim()
  return value || undefined
}

export function getContributionListInput(
  filters: ContributionsFilterParams,
  sort?: string[] | null,
  deferredSearch = filters.search
) {
  const dateRange = resolveDateFilter(filters.dateRange)
  const channel = filters.channel as ContributionChannel | null

  return {
    channel: channel && contributionChannels.has(channel) ? channel : undefined,
    from: dateRange?.from,
    memberId: filters.memberId ?? undefined,
    q: normalizeSearch(deferredSearch),
    sort: normalizeSort(sort),
    to: dateRange?.to,
  }
}
