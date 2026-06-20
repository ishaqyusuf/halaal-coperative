"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { ReportsSearchFilter } from "@/components/reports-search-filter"

export function ReportsHeader({
  filterList,
}: {
  filterList?: PageFilterData[]
}) {
  return <ReportsSearchFilter initialFilterList={filterList} />
}
