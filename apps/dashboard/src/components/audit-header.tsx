"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { AuditSearchFilter } from "@/components/audit-search-filter"

export function AuditHeader({
  filterList,
}: {
  filterList?: PageFilterData[]
}) {
  return <AuditSearchFilter initialFilterList={filterList} />
}
