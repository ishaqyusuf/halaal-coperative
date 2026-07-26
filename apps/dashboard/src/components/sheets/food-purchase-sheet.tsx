"use client"

import { Suspense } from "react"
import type {
  FoodPurchaseApplicationRow,
  FoodPurchaseCycleRow,
} from "@halaalvest/db"
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

const disabledFoodPurchaseApplicationId =
  "00000000-0000-4000-8000-000000000000"

export function FoodPurchaseSheet({
  applications = [],
  approvalChargeOptions = [],
  cycles,
  memberOptions = [],
  selfServiceChargeOptions = [],
  submissionChargeOptions = [],
}: {
  applications?: FoodPurchaseApplicationRow[]
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
  const selectedRouteApplication = applications.find(
    (application) => application.id === foodPurchaseApplicationId
  )
  const shouldLoadSelectedApplication =
    isOpen && Boolean(foodPurchaseApplicationId)
  const { data: fetchedApplication, isLoading: isSelectedApplicationLoading } =
    useQuery(
      trpc.foodPurchase.get.queryOptions(
        {
          foodPurchaseApplicationId:
            foodPurchaseApplicationId ?? disabledFoodPurchaseApplicationId,
        },
        { enabled: shouldLoadSelectedApplication }
      )
    )
  const selectedApplication = fetchedApplication ?? selectedRouteApplication
  const selectedCycle = cycles.find((cycle) => cycle.id === foodPurchaseCycleId)

  const closeSheet = () => {
    void setParams({
      foodPurchaseApplicationId: null,
      foodPurchaseCycleId: null,
      foodPurchaseSheetType: null,
    })
  }

  return (
    <WorkflowPresentation
      config={presentation}
      open={isOpen}
      onOpenChange={(open) => !open && closeSheet()}
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
              application={selectedApplication}
              cycle={selectedCycle}
              type={foodPurchaseSheetType}
            />
            <div className="px-6">
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
              ) : foodPurchaseSheetType === "review" &&
                selectedApplication ? (
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
