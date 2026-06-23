import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const importFilterParamsSchema = {
  q: parseAsString,
  status: parseAsString,
}

export function useImportFilterParams() {
  const [filter, setFilter] = useQueryStates(importFilterParamsSchema)

  return {
    filter,
    hasFilters: Object.values(filter).some((value) => value !== null),
    setFilter,
  }
}

export const loadImportFilterParams = createLoader(importFilterParamsSchema)
