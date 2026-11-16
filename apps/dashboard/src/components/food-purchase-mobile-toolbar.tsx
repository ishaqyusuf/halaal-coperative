"use client"

import { foodPurchaseListControls } from "@/components/food-purchase-search-filter"
import { RequestMobileToolbar } from "@/components/requests/request-list-controls"
import { useFoodPurchaseFilterParams } from "@/hooks/use-food-purchase-filter-params"
import { useFoodPurchaseParams } from "@/hooks/use-food-purchase-params"

export function FoodPurchaseMobileToolbar({
  canCreate,
  hasOpenCycle,
  selfService = false,
}: {
  canCreate: boolean
  hasOpenCycle: boolean
  selfService?: boolean
}) {
  const { filter, setFilter } = useFoodPurchaseFilterParams()
  const { setParams } = useFoodPurchaseParams()

  return (
    <RequestMobileToolbar
      canCreate={canCreate}
      config={foodPurchaseListControls}
      createDisabled={!hasOpenCycle}
      createDisabledReason="No month is open for requests."
      filter={filter}
      onCreate={() =>
        void setParams({
          foodPurchaseApplicationId: null,
          foodPurchaseCycleId: null,
          foodPurchaseSheetType: selfService ? "self-service" : "application",
        })
      }
      setFilter={setFilter}
    />
  )
}
