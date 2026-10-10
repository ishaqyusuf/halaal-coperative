import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const supportFilterParamsSchema = {
  assignedToUserId: parseAsString,
  category: parseAsString,
  priority: parseAsString,
  q: parseAsString,
  status: parseAsString,
}

export const clearedSupportFilters = {
  assignedToUserId: null,
  category: null,
  priority: null,
  q: null,
  status: null,
} as const

export function useSupportFilterParams() {
  const [filter, setFilter] = useQueryStates(supportFilterParamsSchema)

  return {
    filter,
    hasFilters: Object.values(filter).some((value) => value !== null),
    setFilter,
  }
}

export const loadSupportFilterParams = createLoader(supportFilterParamsSchema)
