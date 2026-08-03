import { useQueryStates } from "nuqs"
import {
  createLoader,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
} from "nuqs/server"

const businessFilterParamsSchema = {
  dividendPeriodId: parseAsString,
  dateRange: parseAsArrayOf(parseAsString),
  hasProfitEntries: parseAsBoolean,
  profitStatus: parseAsString,
  q: parseAsString,
  sourceType: parseAsString,
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
