import { useQueryStates } from "nuqs"
import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export type ContributionsFilterParams = {
  channel: string | null
  dateRange: string[] | null
  memberId: string | null
  search: string | null
}

export const contributionsFilterParamsSchema = {
  channel: parseAsString,
  dateRange: parseAsArrayOf(parseAsString),
  memberId: parseAsString,
  search: parseAsString,
}

export function useContributionsFilterParams() {
  const [filters, setFilters] = useQueryStates(
    contributionsFilterParamsSchema,
    {
      shallow: false,
    }
  )

  return {
    filters,
    hasFilters: hasActiveFilters(filters, { ignoreKeys: ["search"] }),
    setFilters,
  }
}

export const loadContributionsFilterParams = createLoader(
  contributionsFilterParamsSchema
)
