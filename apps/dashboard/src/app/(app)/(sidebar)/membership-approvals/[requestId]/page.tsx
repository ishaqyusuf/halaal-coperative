import type { Metadata } from "next"
import { tenantRedirect } from "@/utils/tenant-redirect"

export const metadata: Metadata = {
  title: "Membership request | Halaalvest",
}

// Old links (emails, bookmarks) open the review sheet over the list instead.
export default async function MembershipApprovalDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params

  await tenantRedirect(
    `/membership-approvals?membershipRequestId=${encodeURIComponent(requestId)}`
  )
}
