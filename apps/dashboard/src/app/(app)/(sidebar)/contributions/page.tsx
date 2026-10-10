import type { Metadata } from "next"
import { getContributionFilterMetadata } from "@halaalvest/db"
import {
  ContributionsPageView,
  ContributionsUnavailableView,
} from "@/components/contributions-page-view"
import { loadContributionParams } from "@/hooks/use-contribution-params"
import { loadContributionsFilterParams } from "@/hooks/use-contributions-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadContributionsPageData } from "@/lib/contributions"
import { getContributionListInput } from "@/lib/contributions/contribution-list-input"
import { getDashboardServerContext } from "@/lib/server-context"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  description:
    "Review contribution evidence, member commitments, and source collections.",
  title: "Contributions",
}

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = loadContributionsFilterParams(params)
  const contributionParams = loadContributionParams(params)
  const { sort } = loadSortParams(params)
  const context = await getDashboardServerContext()
  const [data, filterList, contributionTableSettings] = await Promise.all([
    loadContributionsPageData(filters, {
      selectedBatchId: contributionParams.batchId ?? undefined,
    }),
    context.tenant
      ? getContributionFilterMetadata(context.tenant.id)
      : Promise.resolve([]),
    getInitialTableSettings("contributions"),
  ])

  if (data.state !== "ready") {
    return <ContributionsUnavailableView />
  }

  const activeView =
    filters.view === "collections" && !data.canUseCollectionSourceBatches
      ? "ledger"
      : (filters.view ?? "ledger")

  if (activeView === "ledger") {
    const ledgerInput = getContributionListInput(filters, sort)
    await batchPrefetch([
      trpc.contributions.ledger.infiniteQueryOptions(ledgerInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      }),
    ])
  }

  return (
    <HydrateClient>
      <ContributionsPageView
        {...data}
        contributionTableSettings={contributionTableSettings}
        filterList={filterList}
      />
    </HydrateClient>
  )
}
