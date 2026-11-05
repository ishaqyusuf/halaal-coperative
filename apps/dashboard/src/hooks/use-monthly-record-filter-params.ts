import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const monthlyRecordFilterParamsSchema = {
  q: parseAsString,
  status: parseAsStringEnum(["pending", "applied", "cancelled"]),
}

export function useMonthlyRecordFilterParams() {
  const [filter, setFilter] = useQueryStates(monthlyRecordFilterParamsSchema)

  return {
    filter,
    hasFilters: Boolean(filter.q || filter.status),
    setFilter,
  }
}

export const loadMonthlyRecordFilterParams = createLoader(
  monthlyRecordFilterParamsSchema
)
