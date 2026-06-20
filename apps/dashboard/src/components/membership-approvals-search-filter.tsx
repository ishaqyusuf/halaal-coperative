"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { SearchFilter } from "@/components/search-filter"
import {
  membershipApprovalsFilterParamsSchema,
  useMembershipApprovalsFilterParams,
} from "@/hooks/use-membership-approvals-filter-params"

export function MembershipApprovalsSearchFilter({
  initialFilterList,
}: {
  initialFilterList?: PageFilterData[]
}) {
  const { filters, setFilters } = useMembershipApprovalsFilterParams()

  return (
    <SearchFilter
      filterSchema={membershipApprovalsFilterParamsSchema}
      filters={filters}
      initialFilterList={initialFilterList}
      placeholder="Search membership requests..."
      setFilters={setFilters}
    />
  )
}
