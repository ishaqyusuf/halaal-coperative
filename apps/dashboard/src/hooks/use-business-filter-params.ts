import { useQueryStates } from "nuqs"
import { createLoader, parseAsBoolean, parseAsString } from "nuqs/server"

const businessFilterParamsSchema = {
  dividendPeriodId: parseAsString,
  hasProfitEntries: parseAsBoolean,
  profitStatus: parseAsString,
  q: parseAsString,
  sourceType: parseAsString,
  startFrom: parseAsString,
  startTo: parseAsString,
  status: parseAsString,
}

export function useBusinessFilterParams() {
  const [filter, setFilter] = useQueryStates(businessFilterParamsSchema)

  return {
    filter,
    hasFilters: Object.values(filter).some((value) => value !== null),
    setFilter,
  }
}

export const loadBusinessFilterParams = createLoader(businessFilterParamsSchema)
