"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { SearchFilter } from "@/components/search-filter"
import {
  notificationsFilterParamsSchema,
  useNotificationsFilterParams,
} from "@/hooks/use-notifications-filter-params"

export function NotificationsSearchFilter({
  initialFilterList,
}: {
  initialFilterList?: PageFilterData[]
}) {
  const { filters, setFilters } = useNotificationsFilterParams()

  return (
    <SearchFilter
      filterSchema={notificationsFilterParamsSchema}
      filters={filters}
      initialFilterList={initialFilterList}
      placeholder="Search recipient, subject, or notification type..."
      setFilters={setFilters}
    />
  )
}
