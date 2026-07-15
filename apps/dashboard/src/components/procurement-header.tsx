"use client"

import { ProcurementColumnVisibility } from "@/components/procurement-column-visibility"
import { ProcurementSearchFilter } from "@/components/procurement-search-filter"
import { OpenProcurementRequestCreateSheet } from "@/components/open-procurement-request-sheet"

export function ProcurementHeader({
  canCreate,
  hasMemberOptions,
}: {
  canCreate: boolean
  hasMemberOptions: boolean
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">
          Procurement requests
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Review item purchases, approvals, and repayment status.
        </p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <ProcurementSearchFilter />
        <div className="flex items-center gap-2">
          <ProcurementColumnVisibility />
          {canCreate ? (
            <OpenProcurementRequestCreateSheet disabled={!hasMemberOptions} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
