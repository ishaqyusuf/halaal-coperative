import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const procurementFilterParamsSchema = {
  q: parseAsString,
  status: parseAsStringEnum([
    "active",
    "approved",
    "cancelled",
    "completed",
    "purchased",
    "rejected",
    "submitted",
    "under_review",
  ]),
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
