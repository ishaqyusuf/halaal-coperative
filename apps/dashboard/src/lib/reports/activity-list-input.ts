import { resolveDateFilter } from "@halaalvest/utils"
import type { AuditFilterParams } from "@/hooks/use-audit-filter-params"

export const ACTIVITY_PAGE_SIZE = 30

/** One input for the server prefetch and the browser query (same cache key). */
export function getActivityListInput(filters: AuditFilterParams) {
  const resolvedDateRange = resolveDateFilter(filters.dateRange)

  return {
    area: filters.area ?? undefined,
    from: resolvedDateRange?.from,
    pageSize: ACTIVITY_PAGE_SIZE,
    q: filters.search?.trim() || undefined,
    to: resolvedDateRange?.to,
  }
}
