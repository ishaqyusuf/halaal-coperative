"use client"

import { projectFinancingListControls } from "@/components/project-financing-search-filter"
import { RequestMobileToolbar } from "@/components/requests/request-list-controls"
import { useProjectFinancingFilterParams } from "@/hooks/use-project-financing-filter-params"
import { useProjectFinancingParams } from "@/hooks/use-project-financing-params"

export function ProjectFinancingMobileToolbar({
  canCreate,
  createDisabled,
  selfService = false,
}: {
  canCreate: boolean
  createDisabled?: boolean
  selfService?: boolean
}) {
  const { filter, setFilter } = useProjectFinancingFilterParams()
  const { setParams } = useProjectFinancingParams()

  return (
    <RequestMobileToolbar
      canCreate={canCreate}
      config={projectFinancingListControls}
      createDisabled={createDisabled}
      createDisabledReason="Add a member first."
      filter={filter}
      onCreate={() =>
        void setParams({
          projectFinancingRequestId: null,
          projectFinancingSheetType: selfService ? "self-service" : "create",
        })
      }
      setFilter={setFilter}
    />
  )
}
