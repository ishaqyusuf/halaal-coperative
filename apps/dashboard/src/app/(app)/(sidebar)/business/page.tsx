import { createDbRuntime } from "@halaalvest/db"
import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import { BusinessUnavailableView } from "@/components/business-page-states"
import { BusinessPageView } from "@/components/business-page-view"
import { loadBusinessPageParams } from "@/hooks/use-business-page-params"
import { loadBusinessParams } from "@/hooks/use-business-params"
import { loadProfitSeasonParams } from "@/hooks/use-profit-season-params"
import { getBusinessesListInput } from "@/lib/business"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
} from "@/lib/workspace-access"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"

export const metadata: Metadata = {
  title: "Business | Halaalvest",
}

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const { q, status, view } = loadBusinessPageParams(resolvedSearchParams)
  const { businessId } = loadBusinessParams(resolvedSearchParams)
  const { profitSeasonId } = loadProfitSeasonParams(resolvedSearchParams)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const role = context.auth.membership?.role
  const canAccess = hasAnyRole(role, allStaffRoles)

  if (!context.tenant || runtime.status !== "database-configured" || !canAccess) {
    return <BusinessUnavailableView accessDenied={!canAccess} />
  }

  // Totals and setup feed every view; each list loads only on its own tab,
  // and an open sheet's record loads with the page.
  batchPrefetch([
    trpc.business.setup.queryOptions(),
    trpc.business.summary.queryOptions(),
    view === "seasons"
      ? trpc.business.seasons.queryOptions()
      : trpc.business.list.infiniteQueryOptions(
          getBusinessesListInput({ q, status }),
          { getNextPageParam: ({ meta }) => meta?.cursor }
        ),
    ...(businessId && isUuid(businessId)
      ? [trpc.business.get.queryOptions({ businessId })]
      : []),
    ...(profitSeasonId && isUuid(profitSeasonId)
      ? [
          trpc.business.season.queryOptions({ seasonId: profitSeasonId }),
          trpc.business.seasonShares.infiniteQueryOptions(
            { seasonId: profitSeasonId },
            { getNextPageParam: ({ meta }) => meta?.cursor }
          ),
        ]
      : []),
  ])

  return (
    <HydrateClient>
      <BusinessPageView canManage={hasAnyRole(role, financeManagementRoles)} />
    </HydrateClient>
  )
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
}
