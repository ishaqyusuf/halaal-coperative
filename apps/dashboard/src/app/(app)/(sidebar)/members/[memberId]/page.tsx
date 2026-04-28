import { notFound } from "next/navigation"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { MemberDetailView } from "@/components/member-detail-view"
import { loadMemberDetailPageData } from "@/lib/members"

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const { memberId } = await params
  const data = await loadMemberDetailPageData(memberId)

  if (data.state === "unavailable") {
    return (
      <WorkspacePageShell eyebrow="Members" title="Member statement" description="Member finance and identity details are available when the database runtime is active.">
        <WorkspaceEmptyState title="Member detail needs the database runtime." body="Once the database-backed environment is active, this route will show commitment, savings, loan, and repayment history for one member." />
      </WorkspacePageShell>
    )
  }

  if (data.state !== "ready") notFound()

  return <MemberDetailView {...data} />
}
