import { useQueryStates } from "nuqs"
import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export type AuditFilterParams = {
  action: string | null
  dateRange: string[] | null
  search: string | null
}

export const auditFilterParamsSchema = {
  action: parseAsString,
  dateRange: parseAsArrayOf(parseAsString),
  search: parseAsString,
}

export function useAuditFilterParams() {
  const [filters, setFilters] = useQueryStates(auditFilterParamsSchema, {
    shallow: false,
  })

  return {
    filters,
    hasFilters: hasActiveFilters(filters, { ignoreKeys: ["search"] }),
    setFilters,
  }
}

export const loadAuditFilterParams = createLoader(auditFilterParamsSchema)
