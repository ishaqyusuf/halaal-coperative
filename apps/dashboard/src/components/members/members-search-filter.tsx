"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { SearchFilter } from "@/components/search-filter"
import {
  membersFilterParamsSchema,
  useMembersFilterParams,
} from "@/hooks/use-members-filter-params"

export function MembersSearchFilter({
  initialFilterList,
}: {
  initialFilterList?: PageFilterData[]
}) {
  const { filters, setFilters } = useMembersFilterParams()

  return (
    <SearchFilter
      filterSchema={membersFilterParamsSchema}
      filters={filters}
      initialFilterList={initialFilterList}
      placeholder="Search members by name or cooperative number..."
      setFilters={setFilters}
    />
  )
}
