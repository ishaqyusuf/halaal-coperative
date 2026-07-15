import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const projectFinancingFilterParamsSchema = {
  q: parseAsString,
  status: parseAsString,
}

export function useProjectFinancingFilterParams() {
  const [filter, setFilter] = useQueryStates(projectFinancingFilterParamsSchema)

  return {
    filter,
    hasFilters: Object.values(filter).some((value) => value !== null),
    setFilter,
  }
}

export const loadProjectFinancingFilterParams = createLoader(
  projectFinancingFilterParamsSchema
)
