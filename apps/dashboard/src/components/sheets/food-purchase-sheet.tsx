"use client"

import { Suspense } from "react"
import type { FoodPurchaseCycleRow } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { useQuery } from "@tanstack/react-query"
import {
  FoodPurchaseAccountingContent,
  FoodPurchaseAccountingReviewContent,
  FoodPurchaseApplicationCreateContent,
  FoodPurchaseApplicationReviewContent,
  FoodPurchaseReleaseContent,
  MemberFoodPurchaseApplicationCreateContent,
  type FoodPurchaseOption,
} from "@/components/food-purchase-content"
import { FoodPurchaseSheetHeader } from "@/components/food-purchase-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import type { WorkflowChargeOption } from "@/components/workflow-charge-summary"
import { useFoodPurchaseParams } from "@/hooks/use-food-purchase-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

type FoodPurchaseSheetType =
  | "accounting"
  | "accounting-review"
  | "application"
  | "release"
  | "review"
  | "self-service"

function isFoodPurchaseSheetType(
  value: string | null
): value is FoodPurchaseSheetType {
  return (
    value === "accounting" ||
    value === "accounting-review" ||
    value === "application" ||
    value === "release" ||
    value === "review" ||
    value === "self-service"
  )
}

const disabledFoodPurchaseApplicationId = "00000000-0000-4000-8000-000000000000"

export function FoodPurchaseSheet({
  approvalChargeOptions = [],
  cycles,
  memberOptions = [],
  selfServiceChargeOptions = [],
  submissionChargeOptions = [],
}: {
  approvalChargeOptions?: WorkflowChargeOption[]
  cycles: FoodPurchaseCycleRow[]
  memberOptions?: FoodPurchaseOption[]
  selfServiceChargeOptions?: WorkflowChargeOption[]
  submissionChargeOptions?: WorkflowChargeOption[]
}) {
  const trpc = useTRPC()
  const {
    foodPurchaseApplicationId,
    foodPurchaseCycleId,
    foodPurchaseSheetType,
    setParams,
  } = useFoodPurchaseParams()
  const isOpen = isFoodPurchaseSheetType(foodPurchaseSheetType)
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
            <div className="px-6 text-sm text-muted-foreground">
              Loading Foodstuff Purchase form...
            </div>
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
              <FoodPurchaseApplicationCreateContent
                chargeOptions={submissionChargeOptions}
                cycles={cycles}
                memberOptions={memberOptions}
                onClose={closeSheet}
              />
            ) : foodPurchaseSheetType === "self-service" ? (
              <MemberFoodPurchaseApplicationCreateContent
                chargeOptions={selfServiceChargeOptions}
                cycles={cycles}
                onClose={closeSheet}
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
              <p className="text-sm text-muted-foreground">
                Loading Foodstuff Purchase application...
              </p>
            ) : shouldLoadSelectedApplication && isSelectedApplicationError ? (
              <div className="space-y-3 border-y border-border py-5">
                <div>
                  <p className="text-sm font-medium">
                    Could not load this application
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Check your connection and try again.
                  </p>
                </div>
                <Button
                  className="h-11 md:h-9"
                  onClick={() => void refetchSelectedApplication()}
                  type="button"
                  variant="outline"
                >
                  Try again
                </Button>
              </div>
            ) : foodPurchaseSheetType === "review" && selectedApplication ? (
              <FoodPurchaseApplicationReviewContent
                application={selectedApplication}
                chargeOptions={approvalChargeOptions}
                onClose={closeSheet}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                This Foodstuff Purchase record could not be found.
              </p>
            )}
          </div>
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
