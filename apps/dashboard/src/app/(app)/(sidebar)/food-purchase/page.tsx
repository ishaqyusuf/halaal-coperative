import type { SearchParams } from "nuqs"
import { FoodPurchasePageView } from "@/components/food-purchase-page-view"
import { loadFoodPurchaseFilterParams } from "@/hooks/use-food-purchase-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadFoodPurchasePageData } from "@/lib/food-purchase/load-food-purchase-page"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type FoodPurchaseSortField =
  | "approvedAmount"
  | "itemDescription"
  | "memberName"
  | "paidAmount"
  | "requestedAmount"
  | "requestedAt"
  | "status"

type FoodPurchaseStatus =
  | "approved"
  | "cancelled"
  | "rejected"
  | "submitted"
  | "under_review"

function getFoodPurchaseSort(
  sort?: string[] | null
): [FoodPurchaseSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const fieldMap: Record<string, FoodPurchaseSortField> = {
    application: "memberName",
    approved: "approvedAmount",
    approvedAmount: "approvedAmount",
    item: "itemDescription",
    itemDescription: "itemDescription",
    paidAmount: "paidAmount",
    payment: "paidAmount",
    requested: "requestedAmount",
    requestedAmount: "requestedAmount",
    requestedAt: "requestedAt",
    status: "status",
  }
  const sortField = fieldMap[field]

  if (!sortField) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [sortField, direction]
}

function getFoodPurchaseStatus(
  value: string | null
): FoodPurchaseStatus | undefined {
  const validStatuses = new Set<FoodPurchaseStatus>([
    "approved",
    "cancelled",
    "rejected",
    "submitted",
    "under_review",
  ])

  return validStatuses.has(value as FoodPurchaseStatus)
    ? (value as FoodPurchaseStatus)
    : undefined
}

export default async function FoodPurchasePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filter = loadFoodPurchaseFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [data, initialSettings, caller] = await Promise.all([
    loadFoodPurchasePageData(),
    getInitialTableSettings("foodPurchase"),
    getServerCaller(),
  ])
  const queryInput = {
    q: filter.q || undefined,
    sort: getFoodPurchaseSort(sort),
    status: getFoodPurchaseStatus(filter.status),
  }
  const listOptions = trpc.foodPurchase.list.infiniteQueryOptions(queryInput, {
    getNextPageParam: ({ meta }) => meta?.cursor,
  })

  if (data.state === "staff-ready" || data.state === "member-ready") {
    const initialPage = await caller.foodPurchase.list(queryInput)

    getQueryClient().setQueryData(listOptions.queryKey, {
      pageParams: [listOptions.initialPageParam],
      pages: [initialPage],
    })
  }

  return (
    <HydrateClient>
      <FoodPurchasePageView
        data={data}
        foodPurchaseInitialSettings={initialSettings}
      />
    </HydrateClient>
  )
}
