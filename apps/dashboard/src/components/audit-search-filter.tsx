"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { SearchFilter } from "@/components/search-filter"
import { auditFilterParamsSchema, useAuditFilterParams } from "@/hooks/use-audit-filter-params"

export function AuditSearchFilter({
  initialFilterList,
}: {
  initialFilterList?: PageFilterData[]
}) {
  const { filters, setFilters } = useAuditFilterParams()

  return (
    <SearchFilter
      filterSchema={auditFilterParamsSchema}
      filters={filters}
      initialFilterList={initialFilterList}
      placeholder="Search audit activity..."
      setFilters={setFilters}
    />
  )
}
