import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export type MembershipApprovalsFilterParams = {
  search: string | null
  status: string | null
}

export const membershipApprovalsFilterParamsSchema = {
  search: parseAsString,
  status: parseAsString,
}

export function useMembershipApprovalsFilterParams() {
  const [filter, setFilter] = useQueryStates(
    membershipApprovalsFilterParamsSchema
  )

  return {
    filter,
    hasFilters: hasActiveFilters(filter),
    setFilter,
  }
}

export const loadMembershipApprovalsFilterParams = createLoader(
  membershipApprovalsFilterParamsSchema
)
