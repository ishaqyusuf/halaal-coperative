import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const monthlyRecordFilterParamsSchema = {
  q: parseAsString,
  status: parseAsStringEnum(["pending", "applied", "cancelled"]),
  workplaceId: parseAsString,
}

export function useMonthlyRecordFilterParams() {
  const [filter, setFilter] = useQueryStates(monthlyRecordFilterParamsSchema)

  return {
    filter,
    hasFilters: Boolean(filter.q || filter.status || filter.workplaceId),
    setFilter,
  }
}

export const loadMonthlyRecordFilterParams = createLoader(
  monthlyRecordFilterParamsSchema
)
