import { useQueryStates } from "nuqs"
import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export type ContributionsFilterParams = {
  channel: string | null
  dateRange: string[] | null
  memberId: string | null
  search: string | null
  view: "collections" | "commitments" | "ledger" | null
}

export const contributionsLedgerFilterParamsSchema = {
  channel: parseAsString,
  dateRange: parseAsArrayOf(parseAsString),
  memberId: parseAsString,
  search: parseAsString,
}

export const contributionsFilterParamsSchema = {
  ...contributionsLedgerFilterParamsSchema,
  view: parseAsStringEnum(["ledger", "commitments", "collections"]),
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
    hasFilters: hasActiveFilters(filters, { ignoreKeys: ["view"] }),
    setFilters,
  }
}

export const loadContributionsFilterParams = createLoader(
  contributionsFilterParamsSchema
)
