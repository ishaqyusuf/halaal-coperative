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
    <div className="hidden gap-3 border-b border-border bg-background px-4 py-3 md:flex md:items-center md:justify-between">
      <ProcurementSearchFilter />
      <div className="flex items-center gap-2">
        <ProcurementColumnVisibility />
        {canCreate ? (
          <OpenProcurementRequestCreateSheet disabled={!hasMemberOptions} />
        ) : null}
      </div>
    </div>
  )
}
