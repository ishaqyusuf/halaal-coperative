"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { MembershipApprovalsSearchFilter } from "@/components/membership-approvals-search-filter"

export function MembershipApprovalsHeader({
  actions,
  filterList,
}: {
  actions?: React.ReactNode
  filterList?: PageFilterData[]
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <MembershipApprovalsSearchFilter initialFilterList={filterList} />
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
