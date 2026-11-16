"use client"

import type { ProcurementRequestStatus } from "@halaalvest/db"
import {
  RequestSearchFilter,
  type RequestListControlsConfig,
} from "@/components/requests/request-list-controls"
import { useProcurementFilterParams } from "@/hooks/use-procurement-filter-params"
import { getRequestStatusFilterOptions } from "@/lib/requests/request-status-words"

export const procurementListControls: RequestListControlsConfig<ProcurementRequestStatus> =
  {
    defaultSort: "requestedAt,desc",
    drawerDescription: "Filter and sort procurement requests.",
    drawerTitle: "Filter requests",
    idPrefix: "procurement",
    listName: "procurement requests",
    searchPlaceholder: "Search name or item",
    sortOptions: [
      { id: "requestedAt,desc", name: "Newest first" },
      { id: "requestedAt,asc", name: "Oldest first" },
      { id: "requestedCost,desc", name: "Largest amount" },
    ],
    statusOptions: getRequestStatusFilterOptions("procurement").map(
      (option) => ({
        id: option.value as ProcurementRequestStatus,
        name: option.label,
      })
    ),
  }

export function ProcurementSearchFilter() {
  const { filter, setFilter } = useProcurementFilterParams()

  return (
    <RequestSearchFilter
      config={procurementListControls}
      filter={filter}
      setFilter={setFilter}
    />
  )
}
