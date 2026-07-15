"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { ContributionColumnVisibility } from "@/components/contribution-column-visibility"
import { ContributionsSearchFilter } from "@/components/contributions-search-filter"

export function ContributionsHeader({
  filterList,
}: {
  filterList?: PageFilterData[]
}) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <ContributionsSearchFilter initialFilterList={filterList} />
      <ContributionColumnVisibility />
    </div>
  )
}
