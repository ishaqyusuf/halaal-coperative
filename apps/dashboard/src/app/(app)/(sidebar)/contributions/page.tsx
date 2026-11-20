import type { Metadata } from "next"
import {
  ContributionsPageView,
  ContributionsUnavailableView,
} from "@/components/contributions-page-view"
import { loadContributionParams } from "@/hooks/use-contribution-params"
import { loadContributionsFilterParams } from "@/hooks/use-contributions-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadContributionsPageData } from "@/lib/contributions"
import { getContributionListInput } from "@/lib/contributions/contribution-list-input"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"

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
  const data = await loadContributionsPageData(filters, {
    selectedBatchId: contributionParams.batchId ?? undefined,
    stageBatch: contributionParams.contributionSheetType === "stageBatch",
  })

  if (data.state !== "ready") {
    return <ContributionsUnavailableView />
  }

  const { activeView } = data
  if (activeView === "ledger") {
    const ledgerInput = getContributionListInput(filters, sort)
    batchPrefetch([
      trpc.contributions.ledger.infiniteQueryOptions(ledgerInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      }),
    ])
  }

  return (
    <HydrateClient>
      <ContributionsPageView {...data} />
    </HydrateClient>
  )
}
