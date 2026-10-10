import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const chargeFilterParamsSchema = {
  frequency: parseAsString,
  q: parseAsString,
  status: parseAsString,
  valueType: parseAsString,
  view: parseAsStringEnum(["definitions", "applications"]).withDefault(
    "definitions"
  ),
}

export function useChargeFilterParams() {
  const [filter, setFilter] = useQueryStates(chargeFilterParamsSchema)

  return {
    filter,
    hasFilters: Boolean(
      filter.frequency || filter.q || filter.status || filter.valueType
    ),
    setFilter,
  }
}

export const loadChargeFilterParams = createLoader(chargeFilterParamsSchema)
