"use client"

import type { ProjectFinancingRequestStatus } from "@halaalvest/db"
import {
  RequestSearchFilter,
  type RequestListControlsConfig,
} from "@/components/requests/request-list-controls"
import { useProjectFinancingFilterParams } from "@/hooks/use-project-financing-filter-params"
import { getRequestStatusFilterOptions } from "@/lib/requests/request-status-words"

export const projectFinancingListControls: RequestListControlsConfig<ProjectFinancingRequestStatus> =
  {
    defaultSort: "requestedAt,desc",
    drawerDescription: "Filter and sort project financing requests.",
    drawerTitle: "Filter requests",
    idPrefix: "project-financing",
    listName: "project financing requests",
    searchPlaceholder: "Search name or business",
    sortOptions: [
      { id: "requestedAt,desc", name: "Newest first" },
      { id: "requestedAt,asc", name: "Oldest first" },
      { id: "requestedAmount,desc", name: "Largest amount" },
    ],
    statusOptions: getRequestStatusFilterOptions("projectFinancing").map(
      (option) => ({
        id: option.value as ProjectFinancingRequestStatus,
        name: option.label,
      })
    ),
  }

export function ProjectFinancingSearchFilter() {
  const { filter, setFilter } = useProjectFinancingFilterParams()

  return (
    <RequestSearchFilter
      config={projectFinancingListControls}
      filter={filter}
      setFilter={setFilter}
    />
  )
}
