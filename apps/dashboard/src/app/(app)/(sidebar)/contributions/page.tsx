import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { ContributionsPageView } from "@/components/tables/contributions"
import { loadContributionsPageData } from "@/lib/contributions"

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const data = await loadContributionsPageData(await searchParams)

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

  return <ContributionsPageView {...data} />
}
