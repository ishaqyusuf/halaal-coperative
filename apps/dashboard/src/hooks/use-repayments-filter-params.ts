import { useQueryStates } from "nuqs"
import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export type RepaymentsFilterParams = {
  assignedToUserId: string | null
  dateRange: string[] | null
  memberId: string | null
  resolutionStatus: string | null
  scheduleStatus: string | null
  stage: string | null
}

export const repaymentsFilterParamsSchema = {
  assignedToUserId: parseAsString,
  dateRange: parseAsArrayOf(parseAsString),
  memberId: parseAsString,
  resolutionStatus: parseAsString,
  scheduleStatus: parseAsString,
  stage: parseAsString,
}

export function useRepaymentsFilterParams() {
  const [filters, setFilters] = useQueryStates(repaymentsFilterParamsSchema, {
    shallow: false,
  })

  return {
    filters,
    hasFilters: hasActiveFilters(filters),
    setFilters,
  }
}

export const loadRepaymentsFilterParams = createLoader(
  repaymentsFilterParamsSchema
)
