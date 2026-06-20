"use client"

import type { PageFilterData } from "@halaalvest/utils"
import { NotificationsSearchFilter } from "@/components/notifications-search-filter"

export function NotificationsHeader({
  filterList,
}: {
  filterList?: PageFilterData[]
}) {
  return <NotificationsSearchFilter initialFilterList={filterList} />
}
