import { notFound } from "next/navigation"
import { MemberStatementView } from "@/components/member-statement-view"
import { loadMemberDetailPageData } from "@/lib/members"

export default async function MemberStatementPage({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const { memberId } = await params
  const data = await loadMemberDetailPageData(memberId)

  if (data.state !== "ready") notFound()

  return <MemberStatementView {...data} />
}
