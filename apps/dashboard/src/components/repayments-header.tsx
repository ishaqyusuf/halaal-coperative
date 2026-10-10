"use client"

import { RepaymentsSearchFilter } from "@/components/repayments-search-filter"

export function RepaymentsHeader({
  actions,
}: {
  actions?: React.ReactNode
}) {
  return (
    <div className="hidden items-center justify-between gap-4 md:flex">
      <div className="min-w-0 flex-1">
        <RepaymentsSearchFilter />
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
