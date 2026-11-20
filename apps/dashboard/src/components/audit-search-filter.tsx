"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { useCallback } from "react"
import {
  SearchFilter,
  type SearchFilterProps,
} from "@/components/search-filter"
import {
  auditFilterParamsSchema,
  useAuditFilterParams,
} from "@/hooks/use-audit-filter-params"

export function AuditSearchFilter({
  initialFilterList,
}: {
  initialFilterList?: PageFilterData[]
}) {
  const { filters, setFilters } = useAuditFilterParams()
  // Activity's client query follows the URL. The shared control defaults
  // to rerendering the route for pages that load their results on the server.
  const setActivityFilters = useCallback<SearchFilterProps["setFilters"]>(
    (patch, options) => setFilters(patch, { ...options, shallow: true }),
    [setFilters]
  )

  return (
    <SearchFilter
      filterSchema={auditFilterParamsSchema}
      filters={filters}
      initialFilterList={initialFilterList}
      placeholder="Search by name or action"
      setFilters={setActivityFilters}
    />
  )
}
