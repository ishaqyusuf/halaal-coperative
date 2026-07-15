import { notFound } from "next/navigation"
import { createDbRuntime, getMemberOnboardingRequestById } from "@halaalvest/db"
import {
  MembershipApprovalDetailUnavailableView,
  MembershipApprovalDetailView,
} from "@/components/membership-approval-detail-view"
import { getDashboardServerContext } from "@/lib/server-context"

export default async function MembershipApprovalDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const resolvedParams = await params
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return <MembershipApprovalDetailUnavailableView />
  }

  const request = await getMemberOnboardingRequestById(
    context.tenant.id,
    resolvedParams.requestId
  )

  if (!request) {
    notFound()
  }

  return <MembershipApprovalDetailView request={request} />
}
