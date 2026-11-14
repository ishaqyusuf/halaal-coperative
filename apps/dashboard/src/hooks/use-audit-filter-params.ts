import { activityAreas } from "@halaalvest/db/activity-words"
import { useQueryStates } from "nuqs"
import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export type AuditFilterParams = {
  area: (typeof activityAreas)[number] | null
  dateRange: string[] | null
  search: string | null
}

export const auditFilterParamsSchema = {
  area: parseAsStringEnum([...activityAreas]),
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
