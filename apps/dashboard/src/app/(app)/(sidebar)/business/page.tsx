import { createDbRuntime } from "@halaalvest/db"
import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { BusinessPageView } from "@/components/business-page-view"
import { BusinessUnavailableView } from "@/components/business-page-states"
import { loadBusinessFilterParams } from "@/hooks/use-business-filter-params"
import { loadBusinessParams } from "@/hooks/use-business-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { getBusinessesListInput } from "@/lib/business"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  description:
    "Review cooperative business capital, profit evidence, and member distribution readiness.",
  title: "Business | Halaalvest",
}

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filters = loadBusinessFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  loadBusinessParams(resolvedSearchParams)

  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canAccess = hasAnyRole(context.auth.membership?.role, allStaffRoles)

  if (
    !context.tenant ||
    runtime.status !== "database-configured" ||
    !canAccess
  ) {
    return <BusinessUnavailableView accessDenied={!canAccess} />
  }

  const initialSettings = await getInitialTableSettings("business")
  const listInput = getBusinessesListInput(filters, sort)

  await batchPrefetch([
    trpc.business.list.infiniteQueryOptions(listInput, {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }),
    trpc.business.setup.queryOptions(),
    trpc.business.summary.queryOptions(),
  ])

  return (
    <HydrateClient>
      <BusinessPageView initialSettings={initialSettings} />
    </HydrateClient>
  )
}
