import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export type AuditFilterParams = {
  action: string | null
  from: string | null
  search: string | null
  to: string | null
}

export const auditFilterParamsSchema = {
  action: parseAsString,
  from: parseAsString,
  search: parseAsString,
  to: parseAsString,
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
