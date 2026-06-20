"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { SearchFilter } from "@/components/search-filter"
import {
  reportsFilterParamsSchema,
  useReportsFilterParams,
} from "@/hooks/use-reports-filter-params"

export function ReportsSearchFilter({
  initialFilterList,
}: {
  initialFilterList?: PageFilterData[]
}) {
  const { filters, setFilters } = useReportsFilterParams()

  return (
    <SearchFilter
      filterSchema={reportsFilterParamsSchema}
      filters={filters}
      initialFilterList={initialFilterList}
      placeholder="Filter report window..."
      setFilters={setFilters}
    />
  )
}
