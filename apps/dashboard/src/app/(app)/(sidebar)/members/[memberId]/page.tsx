import { notFound } from "next/navigation"
import {
  MemberDetailUnavailableView,
  MemberDetailView,
} from "@/components/member-detail-view"
import { loadMemberDetailParams } from "@/hooks/use-member-detail-params"
import { loadMemberDetailPageData } from "@/lib/members"

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { memberId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  loadMemberDetailParams(resolvedSearchParams)
  const data = await loadMemberDetailPageData(memberId)

  if (data.state === "unavailable") {
    return <MemberDetailUnavailableView />
  }

  if (data.state !== "ready") notFound()

  return <MemberDetailView {...data} />
}
