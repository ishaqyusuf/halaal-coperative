import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const foodPurchaseParamsSchema = {
  foodPurchaseApplicationId: parseAsString,
  foodPurchaseCycleId: parseAsString,
  foodPurchaseSheetType: parseAsString,
}

export function useFoodPurchaseParams() {
  const [params, setParams] = useQueryStates(foodPurchaseParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadFoodPurchaseParams = createLoader(foodPurchaseParamsSchema)
