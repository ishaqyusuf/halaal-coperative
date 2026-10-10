"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import { SearchFilter } from "@/components/search-filter"
import {
  repaymentsFilterParamsSchema,
  useRepaymentsFilterParams,
} from "@/hooks/use-repayments-filter-params"
import { useTRPC } from "@/trpc/client"

export function RepaymentsSearchFilter() {
  const trpc = useTRPC()
  const { filters, setFilters } = useRepaymentsFilterParams()
  const { data: filterList } = useSuspenseQuery(
    trpc.filters.repayments.queryOptions()
  )
  const searchFilterSchema = {
    assignedToUserId: repaymentsFilterParamsSchema.assignedToUserId,
    dateRange: repaymentsFilterParamsSchema.dateRange,
    memberId: repaymentsFilterParamsSchema.memberId,
    q: repaymentsFilterParamsSchema.q,
    repaymentStatus: repaymentsFilterParamsSchema.repaymentStatus,
    resolutionStatus: repaymentsFilterParamsSchema.resolutionStatus,
    scheduleStatus: repaymentsFilterParamsSchema.scheduleStatus,
    stage: repaymentsFilterParamsSchema.stage,
  }
  const searchFilters = {
    assignedToUserId: filters.assignedToUserId,
    dateRange: filters.dateRange,
    memberId: filters.memberId,
    q: filters.q,
    repaymentStatus: filters.repaymentStatus,
    resolutionStatus: filters.resolutionStatus,
    scheduleStatus: filters.scheduleStatus,
    stage: filters.stage,
  }

  return (
    <SearchFilter
      filterSchema={searchFilterSchema}
      filters={searchFilters}
      initialFilterList={filterList}
      placeholder="Filter repayment servicing..."
      setFilters={setFilters}
    />
  )
}
