"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { RepaymentsSearchFilter } from "@/components/repayments-search-filter"

export function RepaymentsHeader({
  actions,
  filterList,
}: {
  actions?: React.ReactNode
  filterList?: PageFilterData[]
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <RepaymentsSearchFilter initialFilterList={filterList} />
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
