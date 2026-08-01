import { createDbRuntime, getTenantMemberSignupSettings } from "@halaalvest/db"
import type { Metadata } from "next"
import {
  MembershipApprovalsUnavailableView,
  MembershipApprovalsView,
} from "@/components/membership-approvals-view"
import { loadMembershipApprovalsFilterParams } from "@/hooks/use-membership-approvals-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { getMembershipApprovalsListInput } from "@/lib/membership-approvals/list-input"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  title: "Membership approvals | Halaalvest",
}

export default async function MembershipApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const params = loadMembershipApprovalsFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManage = hasAnyRole(
    context.auth.membership?.role,
    memberManagementRoles
  )

  if (!context.tenant || runtime.status !== "database-configured") {
    return <MembershipApprovalsUnavailableView />
  }

  const listInput = getMembershipApprovalsListInput(params, sort)
  const [signupSettings, initialTableSettings] = await Promise.all([
    getTenantMemberSignupSettings(context.tenant.id),
    getInitialTableSettings("membershipApprovals"),
  ])
  const listOptions = trpc.onboarding.membershipApprovals.infiniteQueryOptions(
    listInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )

  if (canManage) {
    void batchPrefetch([
      listOptions,
      trpc.onboarding.membershipApprovalSummary.queryOptions(),
    ])
  }

  return (
    <HydrateClient>
      <MembershipApprovalsView
        canManage={canManage}
        initialTableSettings={initialTableSettings}
        showLinkGenerator={signupSettings.memberSignupAccessMode !== "public"}
      />
    </HydrateClient>
  )
}
