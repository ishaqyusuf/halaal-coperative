import { resolveDateFilter } from "@halaalvest/utils"
import type { RepaymentsFilterParams } from "@/hooks/use-repayments-filter-params"

const scheduleStatuses = [
  "pending",
  "due",
  "partially_paid",
  "overdue",
  "paid",
  "waived",
] as const
const historyStatuses = ["pending", "posted", "reversed"] as const
const scheduleSortFields = [
  "dueAt",
  "installmentNumber",
  "memberName",
  "status",
] as const
const historySortFields = ["amount", "memberName", "paidAt", "status"] as const

function getSort<TField extends string>(
  sort: string[] | null | undefined,
  fields: readonly TField[]
): [TField, "asc" | "desc"] | undefined {
  if (!sort || sort.length !== 2) return undefined

  const [field, direction] = sort
  if (!field || !fields.includes(field as TField)) return undefined
  if (direction !== "asc" && direction !== "desc") return undefined

  return [field as TField, direction]
}

function getDateRange(dateRange: string[] | null) {
  const resolved = resolveDateFilter(dateRange)

  return {
    fromDate: resolved?.from
      ? new Date(`${resolved.from}T00:00:00.000Z`)
      : undefined,
    toDate: resolved?.to ? new Date(`${resolved.to}T23:59:59.999Z`) : undefined,
  }
}

export function getRepaymentScheduleListInput(
  filters: RepaymentsFilterParams,
  sort?: string[] | null,
  options?: { collectionsOnly?: boolean; q?: string | null }
) {
  const dates = getDateRange(filters.dateRange)

  return {
    assignedToUserId: filters.assignedToUserId ?? undefined,
    collectionsOnly: options?.collectionsOnly || undefined,
    memberId: filters.memberId ?? undefined,
    q: options?.q ?? filters.q ?? undefined,
    resolutionStatus: filters.resolutionStatus ?? undefined,
    sort: getSort(sort, scheduleSortFields),
    stage: filters.stage ?? undefined,
    status: options?.collectionsOnly
      ? "overdue"
      : scheduleStatuses.includes(
            filters.scheduleStatus as (typeof scheduleStatuses)[number]
          )
        ? (filters.scheduleStatus as (typeof scheduleStatuses)[number])
        : undefined,
    ...dates,
  }
}

export function getRepaymentHistoryListInput(
  filters: RepaymentsFilterParams,
  sort?: string[] | null,
  q = filters.q
) {
  const dates = getDateRange(filters.dateRange)

  return {
    memberId: filters.memberId ?? undefined,
    q: q ?? undefined,
    sort: getSort(sort, historySortFields),
    status: historyStatuses.includes(filters.repaymentStatus as (typeof historyStatuses)[number])
      ? (filters.repaymentStatus as (typeof historyStatuses)[number])
      : undefined,
    ...dates,
  }
}
