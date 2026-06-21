import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const chargeFilterParamsSchema = {
  frequency: parseAsString,
  q: parseAsString,
  status: parseAsString,
  valueType: parseAsString,
}

export function useChargeFilterParams() {
  const [filter, setFilter] = useQueryStates(chargeFilterParamsSchema)

  return {
    filter,
    hasFilters: Object.values(filter).some((value) => value !== null),
    setFilter,
  }
}

export const loadChargeFilterParams = createLoader(chargeFilterParamsSchema)
