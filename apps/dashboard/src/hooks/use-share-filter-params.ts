import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const shareFilterParamsSchema = {
  effectiveFrom: parseAsString,
  effectiveTo: parseAsString,
  q: parseAsString,
  status: parseAsString,
  valueType: parseAsString,
}

export function useShareFilterParams() {
  const [filter, setFilter] = useQueryStates(shareFilterParamsSchema)

  return {
    filter,
    hasFilters: Object.values(filter).some((value) => value !== null),
    setFilter,
  }
}

export const loadShareFilterParams = createLoader(shareFilterParamsSchema)
