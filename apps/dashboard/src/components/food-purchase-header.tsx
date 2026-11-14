"use client"

import { FoodPurchaseColumnVisibility } from "@/components/food-purchase-column-visibility"
import { FoodPurchaseSearchFilter } from "@/components/food-purchase-search-filter"
import { OpenFoodPurchaseSheet } from "@/components/open-food-purchase-sheet"

export function FoodPurchaseHeader({
  canCreate,
  hasOpenCycle,
  selfService = false,
}: {
  canCreate: boolean
  hasOpenCycle: boolean
  selfService?: boolean
}) {
  return (
    <div className="hidden pb-4 md:flex md:items-center md:justify-between md:gap-3">
      <FoodPurchaseSearchFilter />
      <div className="flex items-center gap-2">
        <FoodPurchaseColumnVisibility />
        {canCreate ? (
          <OpenFoodPurchaseSheet
            disabled={!hasOpenCycle}
            type={selfService ? "self-service" : "application"}
          />
        ) : null}
      </div>
    </div>
  )
}
