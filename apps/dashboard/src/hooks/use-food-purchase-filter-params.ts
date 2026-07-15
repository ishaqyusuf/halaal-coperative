import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const foodPurchaseFilterParamsSchema = {
  q: parseAsString,
  status: parseAsString,
}

export function useFoodPurchaseFilterParams() {
  const [filter, setFilter] = useQueryStates(foodPurchaseFilterParamsSchema)

  return {
    filter,
    hasFilters: Object.values(filter).some((value) => value !== null),
    setFilter,
  }
}

export const loadFoodPurchaseFilterParams = createLoader(
  foodPurchaseFilterParamsSchema
)
