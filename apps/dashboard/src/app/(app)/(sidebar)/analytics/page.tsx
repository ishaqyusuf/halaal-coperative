import { AnalyticsView } from "@/components/analytics/analytics-view"
import { HydrateClient, prefetch, trpc } from "@/trpc/server"

export default async function AnalyticsPage() {
  await prefetch(
    trpc.analytics.summary.queryOptions({ period: "last_6_months" }),
  )

  return (
    <HydrateClient>
      <AnalyticsView />
    </HydrateClient>
  )
}
