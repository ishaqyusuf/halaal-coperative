import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const projectFinancingFilterParamsSchema = {
  q: parseAsString,
  status: parseAsStringEnum([
    "active",
    "approved",
    "cancelled",
    "completed",
    "rejected",
    "submitted",
    "under_review",
  ]),
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
