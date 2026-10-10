import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const foodPurchaseFilterParamsSchema = {
  q: parseAsString,
  status: parseAsString,
  view: parseAsStringEnum(["applications", "cycles"]),
}

export const clearedFoodPurchaseFilters = {
  q: null,
  status: null,
  view: null,
} as const

export function useFoodPurchaseFilterParams() {
  const [filter, setFilter] = useQueryStates(foodPurchaseFilterParamsSchema)

  return {
    filter,
    hasFilters: Object.values({ ...filter, view: null }).some(
      (value) => value !== null
    ),
    setFilter,
  }
}

export const loadFoodPurchaseFilterParams = createLoader(
  foodPurchaseFilterParamsSchema
)
