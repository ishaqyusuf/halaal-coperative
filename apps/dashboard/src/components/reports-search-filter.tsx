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
    <div className="min-w-0 max-md:[&_button]:min-h-11 max-md:[&_input]:min-h-11 max-md:[&_select]:min-h-11">
      <SearchFilter
        filterSchema={reportsFilterParamsSchema}
        filters={filters}
        initialFilterList={initialFilterList}
        placeholder="Filter report window..."
        setFilters={setFilters}
      />
    </div>
  )
}
