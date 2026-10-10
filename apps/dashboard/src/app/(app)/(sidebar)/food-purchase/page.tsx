import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { FoodPurchasePageView } from "@/components/food-purchase-page-view"
import { loadFoodPurchaseFilterParams } from "@/hooks/use-food-purchase-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadFoodPurchasePageData } from "@/lib/food-purchase/load-food-purchase-page"
import { getFoodPurchaseListInput } from "@/lib/food-purchase/food-purchase-list-input"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  title: "Foodstuff Purchase | Halaalvest",
}

export default async function FoodPurchasePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filter = loadFoodPurchaseFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [data, initialSettings] = await Promise.all([
    loadFoodPurchasePageData(),
    getInitialTableSettings("foodPurchase"),
  ])
  const queryInput = getFoodPurchaseListInput(filter, sort)
  const listOptions = trpc.foodPurchase.list.infiniteQueryOptions(queryInput, {
    getNextPageParam: ({ meta }) => meta?.cursor,
  })

  if (data.state === "staff-ready" || data.state === "member-ready") {
    await batchPrefetch([listOptions])
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
