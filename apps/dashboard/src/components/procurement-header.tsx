"use client"

import { ProcurementColumnVisibility } from "@/components/procurement-column-visibility"
import { ProcurementSearchFilter } from "@/components/procurement-search-filter"
import {
  OpenMemberProcurementRequestCreateSheet,
  OpenProcurementRequestCreateSheet,
} from "@/components/open-procurement-request-sheet"

export function ProcurementHeader({
  canCreate,
  hasMemberOptions = true,
  selfService = false,
}: {
  canCreate: boolean
  hasMemberOptions?: boolean
  selfService?: boolean
}) {
  return (
    <div className="hidden gap-3 pb-4 md:flex md:items-center md:justify-between">
      <ProcurementSearchFilter />
      <div className="flex items-center gap-2">
        <ProcurementColumnVisibility />
        {canCreate ? (
          selfService ? (
            <OpenMemberProcurementRequestCreateSheet />
          ) : (
            <OpenProcurementRequestCreateSheet disabled={!hasMemberOptions} />
          )
        ) : null}
      </div>
    </div>
  )
}
