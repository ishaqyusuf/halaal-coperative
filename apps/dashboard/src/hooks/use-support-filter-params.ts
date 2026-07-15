import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const supportFilterParamsSchema = {
  priority: parseAsString,
  q: parseAsString,
  status: parseAsString,
}

export function useSupportFilterParams() {
  const [filter, setFilter] = useQueryStates(supportFilterParamsSchema)

  return {
    filter,
    hasFilters: Object.values(filter).some((value) => value !== null),
    setFilter,
  }
}

export const loadSupportFilterParams = createLoader(supportFilterParamsSchema)
