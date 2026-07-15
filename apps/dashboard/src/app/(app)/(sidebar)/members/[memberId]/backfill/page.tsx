import { notFound } from "next/navigation"
import type { SearchParams } from "nuqs"
import {
  MemberBackfillPageView,
  MemberBackfillUnavailableView,
} from "@/components/members/member-backfill-page-view"
import { resolveMemberBackfillStep } from "@/components/members/member-backfill-steps"
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
  const data = await loadMemberBackfillWorkflowData(memberId)

  if (data.state === "unavailable") {
    return <MemberBackfillUnavailableView />
  }

  if (data.state !== "ready") notFound()

  const activeStep = resolveMemberBackfillStep(
    memberBackfillParams.step ?? undefined,
    data.migrationSetupMode
  )

  return <MemberBackfillPageView activeStep={activeStep} data={data} />
}
