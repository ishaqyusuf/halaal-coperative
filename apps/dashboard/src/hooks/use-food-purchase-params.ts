import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const foodPurchaseSheetTypes = [
  "accounting",
  "accounting-review",
  "application",
  "details",
  "release",
  // Older links; it opens the same sheet as `details`.
  "review",
  "self-service",
] as const

export type FoodPurchaseSheetType = (typeof foodPurchaseSheetTypes)[number]

const foodPurchaseParamsSchema = {
  foodPurchaseApplicationId: parseAsString,
  foodPurchaseCycleId: parseAsString,
  foodPurchaseSheetType: parseAsStringEnum([...foodPurchaseSheetTypes]),
}

export function useFoodPurchaseParams() {
  const [params, setParams] = useQueryStates(foodPurchaseParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadFoodPurchaseParams = createLoader(foodPurchaseParamsSchema)
