import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const businessFilterParamsSchema = {
  profitStatus: parseAsString,
  q: parseAsString,
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
