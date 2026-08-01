import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import type { SearchParams } from "nuqs"
import {
  MemberBackfillPageView,
  MemberBackfillUnavailableView,
} from "@/components/members/member-backfill-page-view"
import {
  memberBackfillStepHref,
  resolveMemberBackfillStep,
} from "@/components/members/member-backfill-steps"
import { loadMemberBackfillParams } from "@/hooks/use-member-backfill-params"
import { loadMemberBackfillWorkflowData } from "@/lib/members"

export const metadata: Metadata = {
  title: "Member migration | Halaalvest",
}

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

  const requestedStep = memberBackfillParams.step ?? undefined
  const activeStep = resolveMemberBackfillStep(
    requestedStep,
    data.migrationSetupMode
  )

  if (requestedStep !== activeStep) {
    const canonicalStepHref = memberBackfillStepHref(memberId, activeStep)
    const sheetType = memberBackfillParams.memberBackfillSheetType

    redirect(
      sheetType
        ? `${canonicalStepHref}&memberBackfillSheetType=${encodeURIComponent(sheetType)}`
        : canonicalStepHref
    )
  }

  return <MemberBackfillPageView activeStep={activeStep} data={data} />
}
