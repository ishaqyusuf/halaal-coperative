"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PlusIcon } from "lucide-react"
import {
  type FoodPurchaseSheetType,
  useFoodPurchaseParams,
} from "@/hooks/use-food-purchase-params"

const labels: Partial<Record<FoodPurchaseSheetType, string>> = {
  application: "New request",
  release: "Open a month",
  "self-service": "Ask for foodstuff",
}

/** Opens one of the foodstuff create sheets. */
export function OpenFoodPurchaseSheet({
  className,
  disabled,
  type,
}: {
  className?: string
  disabled?: boolean
  type: "application" | "release" | "self-service"
}) {
  const { setParams } = useFoodPurchaseParams()

  return (
    <Button
      className={className}
      disabled={disabled}
      onClick={() =>
        void setParams({
          foodPurchaseApplicationId: null,
          foodPurchaseCycleId: null,
          foodPurchaseSheetType: type,
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      {labels[type]}
    </Button>
  )
}
