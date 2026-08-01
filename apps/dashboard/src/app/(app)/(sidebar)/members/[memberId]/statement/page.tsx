import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MemberStatementView } from "@/components/member-statement-view"
import { MemberStatementUnavailableView } from "@/components/member-statement-page-states"
import { loadMemberStatementPageData } from "@/lib/members"

export const metadata: Metadata = {
  description:
    "Printable cooperative member balances, charges, dividends, and ledger evidence.",
  title: "Member statement | Halaalvest",
}

export default async function MemberStatementPage({
  params,
}: {
  params: Promise<{ memberId: string }>
}) {
  const { memberId } = await params
  const data = await loadMemberStatementPageData(memberId)

  if (data.state === "unavailable") {
    return <MemberStatementUnavailableView />
  }

  if (data.state !== "ready") notFound()

  return <MemberStatementView {...data} />
}
