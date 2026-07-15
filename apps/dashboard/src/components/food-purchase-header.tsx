"use client"

import { FoodPurchaseColumnVisibility } from "@/components/food-purchase-column-visibility"
import { FoodPurchaseSearchFilter } from "@/components/food-purchase-search-filter"
import { OpenFoodPurchaseApplicationSheet } from "@/components/open-food-purchase-sheet"

export function FoodPurchaseHeader({
  canSubmitApplications,
  hasOpenCycle,
}: {
  canSubmitApplications: boolean
  hasOpenCycle: boolean
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-background px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">
          Foodstuff Purchase applications
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Review member food applications, approved value, and repayment status.
        </p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <FoodPurchaseSearchFilter />
        <div className="flex items-center gap-2">
          <FoodPurchaseColumnVisibility />
          {canSubmitApplications ? (
            <OpenFoodPurchaseApplicationSheet disabled={!hasOpenCycle} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
