import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const loanFilterParamsSchema = {
  portfolioStatus: parseAsStringEnum([
    "approved",
    "disbursed",
    "active",
    "completed",
    "defaulted",
    "written_off",
  ]),
  q: parseAsString,
  requestStatus: parseAsStringEnum([
    "draft",
    "submitted",
    "under_review",
    "approved",
    "rejected",
    "cancelled",
    "expired",
  ]),
  view: parseAsStringEnum(["requests", "portfolio"]).withDefault("requests"),
}

export const clearedLoanFilters = {
  portfolioStatus: null,
  q: null,
  requestStatus: null,
} as const

export function useLoanFilterParams() {
  const [filter, setFilter] = useQueryStates(loanFilterParamsSchema)

  return {
    filter,
    hasFilters: Boolean(
      filter.portfolioStatus || filter.q || filter.requestStatus
    ),
    setFilter,
  }
}

export const loadLoanFilterParams = createLoader(loanFilterParamsSchema)
