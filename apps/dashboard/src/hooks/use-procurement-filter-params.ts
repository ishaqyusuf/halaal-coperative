import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const procurementFilterParamsSchema = {
  q: parseAsString,
  status: parseAsString,
}

export function useProcurementFilterParams() {
  const [filter, setFilter] = useQueryStates(procurementFilterParamsSchema)

  return {
    filter,
    hasFilters: Object.values(filter).some((value) => value !== null),
    setFilter,
  }
}

export const loadProcurementFilterParams = createLoader(
  procurementFilterParamsSchema
)
