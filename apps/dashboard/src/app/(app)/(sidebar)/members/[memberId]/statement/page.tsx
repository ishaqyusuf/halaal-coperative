import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MemberStatementView } from "@/components/member-statement-view"
import { MemberStatementUnavailableView } from "@/components/member-statement-page-states"
import { loadMemberStatementPageData } from "@/lib/members"

/** `?page=N` (1-based); anything else is the newest page. */
function parseStatementPage(value: string | string[] | undefined) {
  const page = Number(Array.isArray(value) ? value[0] : value)

  return Number.isInteger(page) && page > 1 ? Math.min(page, 10_000) : 1
}

export const metadata: Metadata = {
  description: "A member's balances and every payment in and out.",
  title: "Member statement | Halaalvest",
}

export default async function MemberStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>
  searchParams: Promise<{ page?: string | string[] }>
}) {
  const [{ memberId }, query] = await Promise.all([params, searchParams])
  const data = await loadMemberStatementPageData(
    memberId,
    parseStatementPage(query.page)
  )

  if (data.state === "unavailable") {
    return <MemberStatementUnavailableView />
  }

  if (data.state !== "ready") notFound()

  return <MemberStatementView {...data} />
}
