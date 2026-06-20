import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export type RepaymentsFilterParams = {
  assignedToUserId: string | null
  from: string | null
  memberId: string | null
  resolutionStatus: string | null
  scheduleStatus: string | null
  stage: string | null
  to: string | null
}

export const repaymentsFilterParamsSchema = {
  assignedToUserId: parseAsString,
  from: parseAsString,
  memberId: parseAsString,
  resolutionStatus: parseAsString,
  scheduleStatus: parseAsString,
  stage: parseAsString,
  to: parseAsString,
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

export const loadRepaymentsFilterParams = createLoader(repaymentsFilterParamsSchema)
