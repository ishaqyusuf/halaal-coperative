"use client"

import { procurementListControls } from "@/components/procurement-search-filter"
import { RequestMobileToolbar } from "@/components/requests/request-list-controls"
import { useProcurementFilterParams } from "@/hooks/use-procurement-filter-params"
import { useProcurementParams } from "@/hooks/use-procurement-params"

export function ProcurementMobileToolbar({
  canCreate,
  createDisabled,
  selfService = false,
}: {
  canCreate: boolean
  createDisabled?: boolean
  selfService?: boolean
}) {
  const { filter, setFilter } = useProcurementFilterParams()
  const { setParams } = useProcurementParams()

  return (
    <RequestMobileToolbar
      canCreate={canCreate}
      config={procurementListControls}
      createDisabled={createDisabled}
      createDisabledReason="Add a member first."
      filter={filter}
      onCreate={() =>
        void setParams({
          procurementRequestId: null,
          procurementSheetType: selfService ? "self-service" : "create",
        })
      }
      setFilter={setFilter}
    />
  )
}
