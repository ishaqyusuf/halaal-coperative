import { useQueryStates } from "nuqs"
import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export type ReportsFilterParams = {
  dateRange: string[] | null
}

export const reportsFilterParamsSchema = {
  dateRange: parseAsArrayOf(parseAsString),
}

export function useReportsFilterParams() {
  const [filters, setFilters] = useQueryStates(reportsFilterParamsSchema, {
    shallow: false,
  })

  return {
    filters,
    hasFilters: hasActiveFilters(filters),
    setFilters,
  }
}

export const loadReportsFilterParams = createLoader(reportsFilterParamsSchema)
