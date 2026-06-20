"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { SearchFilter } from "@/components/search-filter"
import {
  repaymentsFilterParamsSchema,
  useRepaymentsFilterParams,
} from "@/hooks/use-repayments-filter-params"

export function RepaymentsSearchFilter({
  initialFilterList,
}: {
  initialFilterList?: PageFilterData[]
}) {
  const { filters, setFilters } = useRepaymentsFilterParams()

  return (
    <SearchFilter
      filterSchema={repaymentsFilterParamsSchema}
      filters={filters}
      initialFilterList={initialFilterList}
      placeholder="Filter repayment servicing..."
      setFilters={setFilters}
    />
  )
}
