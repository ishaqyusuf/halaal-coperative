import { notFound } from "next/navigation"
import type { SearchParams } from "nuqs"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { MemberBackfillPageView } from "@/components/members/member-backfill-page-view"
import { loadMemberBackfillParams } from "@/hooks/use-member-backfill-params"
import { loadMemberBackfillWorkflowData } from "@/lib/members"

export default async function MemberBackfillPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>
  searchParams?: Promise<SearchParams>
}) {
  const { memberId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const memberBackfillParams = loadMemberBackfillParams(resolvedSearchParams)
  const activeStep = memberBackfillParams.step ?? "baseline"
  const data = await loadMemberBackfillWorkflowData(memberId)

  if (data.state === "unavailable") {
    return (
      <WorkspacePageShell
        eyebrow="Member backfill"
        title="Member backfill"
        description="Member historical setup is available when the database runtime is active."
      >
        <WorkspaceEmptyState
          title="Member backfill needs the database runtime."
          body="Once the database-backed environment is active, this page will guide one member through historical setup and ledger backfill."
        />
      </WorkspacePageShell>
    )
  }

  if (data.state !== "ready") notFound()

  return <MemberBackfillPageView activeStep={activeStep} data={data} />
}
