import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"
import { sortParamsSchema } from "@/hooks/use-sort-params"

export type MembersFilterParams = {
  joinedFrom: string | null
  joinedTo: string | null
  kycStatus: string | null
  memberType: string | null
  migrationStatus: string | null
  q: string | null
  status: string | null
}

export const membersFilterParamsSchema = {
  joinedFrom: parseAsString,
  joinedTo: parseAsString,
  kycStatus: parseAsString,
  memberType: parseAsString,
  migrationStatus: parseAsString,
  q: parseAsString,
  status: parseAsString,
}

export const membersControlsParamsSchema = {
  ...membersFilterParamsSchema,
  ...sortParamsSchema,
}

export const clearedMembersControlsParams = {
  joinedFrom: null,
  joinedTo: null,
  kycStatus: null,
  memberType: null,
  migrationStatus: null,
  q: null,
  sort: null,
  status: null,
} as const

export function useMembersFilterParams() {
  const [filters, setFilters] = useQueryStates(membersFilterParamsSchema, {
    shallow: false,
  })

  return {
    filters,
    hasFilters: hasActiveFilters(filters, { ignoreKeys: ["q"] }),
    setFilters,
  }
}

export function useMembersControlsParams() {
  const [params, setParams] = useQueryStates(membersControlsParamsSchema, {
    shallow: false,
  })
  const hasActiveControls = Object.values(params).some((value) =>
    Array.isArray(value)
      ? value.length > 0
      : value !== null && value !== undefined && value !== ""
  )

  return {
    hasActiveControls,
    params,
    setParams,
  }
}

export const loadMembersFilterParams = createLoader(membersFilterParamsSchema)
