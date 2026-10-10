import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const shareApplicationFilterParamsSchema = {
  shareApplicationQ: parseAsString,
  shareApplicationStatus: parseAsStringEnum([
    "approved",
    "cancelled",
    "pending",
    "rejected",
  ]),
}

export function useShareApplicationFilterParams() {
  const [filter, setFilter] = useQueryStates(shareApplicationFilterParamsSchema)

  return {
    filter,
    hasFilters: Object.values(filter).some((value) => value !== null),
    setFilter,
  }
}

export const loadShareApplicationFilterParams = createLoader(
  shareApplicationFilterParamsSchema
)
