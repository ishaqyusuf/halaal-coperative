import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { AnalyticsView } from "@/components/analytics/analytics-view"
import { loadAnalyticsParams } from "@/hooks/use-analytics-params"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"

export const metadata: Metadata = {
  title: "Analytics | Halaalvest",
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { period } = loadAnalyticsParams(await searchParams)
  prefetch(trpc.analytics.summary.queryOptions({ period }))

  return (
    <HydrateClient>
      <AnalyticsView />
    </HydrateClient>
  )
}
