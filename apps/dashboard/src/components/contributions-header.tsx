"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { ContributionsSearchFilter } from "@/components/contributions-search-filter"

export function ContributionsHeader({
  filterList,
}: {
  filterList?: PageFilterData[]
}) {
  return <ContributionsSearchFilter initialFilterList={filterList} />
}
