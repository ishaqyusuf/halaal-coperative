"use client"

import {
  RequestSearchFilter,
  type RequestListControlsConfig,
} from "@/components/requests/request-list-controls"
import { useFoodPurchaseFilterParams } from "@/hooks/use-food-purchase-filter-params"

export const foodPurchaseListControls: RequestListControlsConfig<string> = {
  defaultSort: "requestedAt,desc",
  drawerDescription: "Filter and sort Foodstuff Purchase applications.",
  drawerTitle: "Filter applications",
  idPrefix: "food-purchase",
  listName: "foodstuff requests",
  searchPlaceholder: "Search name or food",
  sortOptions: [
    { id: "requestedAt,desc", name: "Newest first" },
    { id: "requestedAt,asc", name: "Oldest first" },
    { id: "requestedAmount,desc", name: "Largest amount asked" },
    { id: "approvedAmount,desc", name: "Largest amount approved" },
  ],
  statusOptions: [
    { id: "submitted", name: "Waiting" },
    { id: "under_review", name: "Being checked" },
    { id: "approved", name: "Approved" },
    { id: "rejected", name: "Declined" },
    { id: "cancelled", name: "Cancelled" },
  ],
}

export function FoodPurchaseSearchFilter() {
  const { filter, setFilter } = useFoodPurchaseFilterParams()

  return (
    <RequestSearchFilter
      config={foodPurchaseListControls}
      filter={filter}
      setFilter={setFilter}
    />
  )
}
