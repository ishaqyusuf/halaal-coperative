"use client"

import { Suspense } from "react"
import type { FoodPurchaseCycleRow } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { useQuery } from "@tanstack/react-query"
import {
  FoodPurchaseAccountingContent,
  FoodPurchaseAccountingReviewContent,
  FoodPurchaseApplicationDetails,
  FoodPurchaseApplicationForm,
  FoodPurchaseReleaseContent,
} from "@/components/food-purchase-content"
import { FoodPurchaseSheetHeader } from "@/components/food-purchase-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useFoodPurchaseParams } from "@/hooks/use-food-purchase-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

const disabledFoodPurchaseApplicationId = "00000000-0000-4000-8000-000000000000"

/**
 * One URL-addressed host for foodstuff: new request, the request itself (staff
 * decide inside it), opening a month and the month-end figures. Charges load
 * inside the forms that show them.
 */
export function FoodPurchaseSheet({
  canReview = false,
  cycles,
}: {
  canReview?: boolean
  cycles: FoodPurchaseCycleRow[]
}) {
  const trpc = useTRPC()
  const {
    foodPurchaseApplicationId,
    foodPurchaseCycleId,
    foodPurchaseSheetType,
    setParams,
  } = useFoodPurchaseParams()
  const isOpen = foodPurchaseSheetType !== null
  const presentation = getWorkflowPresentation(
    "foodPurchase",
    foodPurchaseSheetType
  )
  const shouldLoadSelectedApplication =
    isOpen && Boolean(foodPurchaseApplicationId)
  const {
    data: selectedApplication,
    isError: isSelectedApplicationError,
    isLoading: isSelectedApplicationLoading,
    refetch: refetchSelectedApplication,
  } = useQuery(
    trpc.foodPurchase.get.queryOptions(
      {
        foodPurchaseApplicationId:
          foodPurchaseApplicationId ?? disabledFoodPurchaseApplicationId,
      },
      { enabled: shouldLoadSelectedApplication }
    )
  )
  const selectedCycle = cycles.find((cycle) => cycle.id === foodPurchaseCycleId)

  const closeSheet = async () => {
    await setParams({
      foodPurchaseApplicationId: null,
      foodPurchaseCycleId: null,
      foodPurchaseSheetType: null,
    })
  }

  return (
    <WorkflowPresentation
      config={presentation}
      mobileFullScreen
      open={isOpen}
      onOpenChange={(open) => !open && void closeSheet()}
    >
      {isOpen ? (
        <Suspense
          fallback={
            <div className="px-6 text-sm text-muted-foreground">Loading...</div>
          }
        >
          <FoodPurchaseSheetHeader
            application={selectedApplication ?? undefined}
            cycle={selectedCycle}
            type={foodPurchaseSheetType}
          />
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            {foodPurchaseSheetType === "release" ? (
              <FoodPurchaseReleaseContent onClose={closeSheet} />
            ) : foodPurchaseSheetType === "application" ? (
              <FoodPurchaseApplicationForm
                cycles={cycles}
                onClose={closeSheet}
              />
            ) : foodPurchaseSheetType === "self-service" ? (
              <FoodPurchaseApplicationForm
                cycles={cycles}
                onClose={closeSheet}
                selfService
              />
            ) : foodPurchaseSheetType === "accounting" && selectedCycle ? (
              <FoodPurchaseAccountingContent
                cycle={selectedCycle}
                onClose={closeSheet}
              />
            ) : foodPurchaseSheetType === "accounting-review" &&
              selectedCycle ? (
              <FoodPurchaseAccountingReviewContent
                cycle={selectedCycle}
                onClose={closeSheet}
              />
            ) : shouldLoadSelectedApplication &&
              isSelectedApplicationLoading ? (
              <p className="text-base text-muted-foreground">Loading...</p>
            ) : shouldLoadSelectedApplication && isSelectedApplicationError ? (
              <div className="grid gap-3">
                <p className="text-base">This request could not be loaded.</p>
                <Button
                  className="h-12 w-full sm:w-auto"
                  onClick={() => void refetchSelectedApplication()}
                  type="button"
                  variant="outline"
                >
                  Try again
                </Button>
              </div>
            ) : (foodPurchaseSheetType === "details" ||
                foodPurchaseSheetType === "review") &&
              selectedApplication ? (
              <FoodPurchaseApplicationDetails
                application={selectedApplication}
                canReview={canReview}
                onClose={closeSheet}
              />
            ) : (
              <p className="text-base text-muted-foreground">
                This could not be found.
              </p>
            )}
          </div>
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
