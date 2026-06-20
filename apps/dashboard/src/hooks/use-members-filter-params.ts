import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export type MembersFilterParams = {
  joinedFrom: string | null
  joinedTo: string | null
  kycStatus: string | null
  memberType: string | null
  search: string | null
  status: string | null
}

export const membersFilterParamsSchema = {
  joinedFrom: parseAsString,
  joinedTo: parseAsString,
  kycStatus: parseAsString,
  memberType: parseAsString,
  search: parseAsString,
  status: parseAsString,
}

export function useMembersFilterParams() {
  const [filters, setFilters] = useQueryStates(membersFilterParamsSchema, {
    shallow: false,
  })

  return {
    filters,
    hasFilters: hasActiveFilters(filters, { ignoreKeys: ["search"] }),
    setFilters,
  }
}

export const loadMembersFilterParams = createLoader(membersFilterParamsSchema)
