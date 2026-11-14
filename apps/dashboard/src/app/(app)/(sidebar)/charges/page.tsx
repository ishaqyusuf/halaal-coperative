import {
  countRecentPostedChargeApplications,
  createDbRuntime,
} from "@halaalvest/db"
import type { Metadata } from "next"
import {
  ChargesPageView,
  ChargesUnavailableView,
} from "@/components/charges-page-view"
import { loadChargesPageParams } from "@/hooks/use-charges-page-params"
import {
  chargeTypesInput,
  getChargeActivityInput,
} from "@/lib/charges/charge-list-input"
import {
  canShowQuickFill,
  getDashboardServerContext,
} from "@/lib/server-context"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"

export const metadata: Metadata = {
  title: "Charges | Halaalvest",
}

export default async function ChargesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { chargedQ, view } = loadChargesPageParams(await searchParams)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return <ChargesUnavailableView />
  }

  // Charge types feed the cards, the list and every overlay; member charges
  // load only on their own tab.
  batchPrefetch([
    trpc.charges.chargeLibrary.queryOptions(chargeTypesInput),
    ...(view === "applications"
      ? [
          trpc.charges.activity.infiniteQueryOptions(
            getChargeActivityInput(chargedQ),
            { getNextPageParam: ({ meta }) => meta?.cursor }
          ),
        ]
      : []),
  ])
  const recentPostedCount = await countRecentPostedChargeApplications(
    context.tenant.id
  )

  return (
    <HydrateClient>
      <ChargesPageView
        activeView={view}
        canManageCharges={hasAnyRole(
          context.auth.membership?.role,
          financeManagementRoles
        )}
        quickFillEnabled={canShowQuickFill(context)}
        recentPostedCount={recentPostedCount}
      />
    </HydrateClient>
  )
}
