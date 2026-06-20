import { getContributionFilterMetadata } from "@halaalvest/db"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { ContributionsPageView } from "@/components/contributions-page-view"
import { loadContributionsFilterParams } from "@/hooks/use-contributions-filter-params"
import { loadContributionsPageData } from "@/lib/contributions"
import { getDashboardServerContext } from "@/lib/server-context"

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = loadContributionsFilterParams(params)
  const context = await getDashboardServerContext()
  const [data, filterList] = await Promise.all([
    loadContributionsPageData(filters),
    context.tenant ? getContributionFilterMetadata(context.tenant.id) : Promise.resolve([]),
  ])

  if (data.state !== "ready") {
    return (
      <WorkspacePageShell eyebrow="Contributions" title="Contribution ledger" description="Contribution collection and posting activity for the active cooperative.">
        <WorkspaceEmptyState
          title="Contribution history is waiting for the database runtime."
          body="Once the database-backed environment is active, this route will show posted contributions, member attribution, commitment plans, and collection channels."
        />
      </WorkspacePageShell>
    )
  }

  return <ContributionsPageView {...data} filterList={filterList} />
}
