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
  const [filters, setFilters] = useQueryStates(membershipApprovalsFilterParamsSchema, {
    shallow: false,
  })

  return {
    filters,
    hasFilters: hasActiveFilters(filters, { ignoreKeys: ["search"] }),
    setFilters,
  }
}

export const loadMembershipApprovalsFilterParams = createLoader(
  membershipApprovalsFilterParamsSchema,
)
