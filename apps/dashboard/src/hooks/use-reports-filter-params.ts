import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export type ReportsFilterParams = {
  from: string | null
  to: string | null
}

export const reportsFilterParamsSchema = {
  from: parseAsString,
  to: parseAsString,
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
