"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { SearchFilter } from "@/components/search-filter"
import {
  contributionsFilterParamsSchema,
  useContributionsFilterParams,
} from "@/hooks/use-contributions-filter-params"

export function ContributionsSearchFilter({
  initialFilterList,
}: {
  initialFilterList?: PageFilterData[]
}) {
  const { filters, setFilters } = useContributionsFilterParams()

  return (
    <SearchFilter
      filterSchema={contributionsFilterParamsSchema}
      filters={filters}
      initialFilterList={initialFilterList}
      placeholder="Search contribution activity..."
      setFilters={setFilters}
    />
  )
}
