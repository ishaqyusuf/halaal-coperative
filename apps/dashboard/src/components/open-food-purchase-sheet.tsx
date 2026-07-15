"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  CalculatorIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  FilePlus2Icon,
  HandCoinsIcon,
  ShoppingBasketIcon,
} from "lucide-react"
import { useFoodPurchaseParams } from "@/hooks/use-food-purchase-params"

export function OpenFoodPurchaseReleaseSheet() {
  const { setParams } = useFoodPurchaseParams()

  return (
    <Button
      onClick={() =>
        setParams({
          foodPurchaseApplicationId: null,
          foodPurchaseCycleId: null,
          foodPurchaseSheetType: "release",
        })
      }
      type="button"
    >
      <HandCoinsIcon data-icon="inline-start" />
      Record fund release
    </Button>
  )
}

export function OpenFoodPurchaseApplicationSheet({
  disabled,
}: {
  disabled?: boolean
}) {
  const { setParams } = useFoodPurchaseParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          foodPurchaseApplicationId: null,
          foodPurchaseCycleId: null,
          foodPurchaseSheetType: "application",
        })
      }
      type="button"
      variant="outline"
    >
      <FilePlus2Icon data-icon="inline-start" />
      Record application
    </Button>
  )
}

export function OpenMemberFoodPurchaseApplicationSheet({
  disabled,
}: {
  disabled?: boolean
}) {
  const { setParams } = useFoodPurchaseParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          foodPurchaseApplicationId: null,
          foodPurchaseCycleId: null,
          foodPurchaseSheetType: "self-service",
        })
      }
      type="button"
    >
      <ShoppingBasketIcon data-icon="inline-start" />
      Apply
    </Button>
  )
}

export function OpenFoodPurchaseAccountingSheet({
  cycleId,
}: {
  cycleId: string
}) {
  const { setParams } = useFoodPurchaseParams()

  return (
    <Button
      onClick={() =>
        setParams({
          foodPurchaseApplicationId: null,
          foodPurchaseCycleId: cycleId,
          foodPurchaseSheetType: "accounting",
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <CalculatorIcon data-icon="inline-start" />
      Record accounting
    </Button>
  )
}

export function OpenFoodPurchaseAccountingReviewSheet({
  cycleId,
}: {
  cycleId: string
}) {
  const { setParams } = useFoodPurchaseParams()

  return (
    <Button
      onClick={() =>
        setParams({
          foodPurchaseApplicationId: null,
          foodPurchaseCycleId: cycleId,
          foodPurchaseSheetType: "accounting-review",
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <ClipboardCheckIcon data-icon="inline-start" />
      Review accounting
    </Button>
  )
}

export function OpenFoodPurchaseApplicationReviewSheet({
  applicationId,
}: {
  applicationId: string
}) {
  const { setParams } = useFoodPurchaseParams()

  return (
    <Button
      onClick={() =>
        setParams({
          foodPurchaseApplicationId: applicationId,
          foodPurchaseCycleId: null,
          foodPurchaseSheetType: "review",
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <CheckCircle2Icon data-icon="inline-start" />
      Review application
    </Button>
  )
}
