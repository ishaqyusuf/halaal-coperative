import {
  createDbRuntime,
  getMembershipApprovalFilterMetadata,
  getTenantMemberSignupSettings,
} from "@halaalvest/db"
import {
  MembershipApprovalsUnavailableView,
  MembershipApprovalsView,
} from "@/components/membership-approvals-view"
import { loadMembershipApprovalsFilterParams } from "@/hooks/use-membership-approvals-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type MembershipApprovalSortField =
  | "emailVerifiedAt"
  | "fullName"
  | "memberNumber"
  | "phoneNumber"
  | "status"
  | "submittedAt"

function getSort(
  sort?: string[] | null
): [MembershipApprovalSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "emailVerifiedAt",
    "fullName",
    "memberNumber",
    "phoneNumber",
    "status",
    "submittedAt",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as MembershipApprovalSortField, direction]
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
  const search = params.search ?? undefined
  const status =
    params.status &&
    [
      "pending_email_verification",
      "pending_approval",
      "approved",
      "rejected",
      "cancelled",
    ].includes(params.status)
      ? params.status
      : undefined

  if (!context.tenant || runtime.status !== "database-configured") {
    return <MembershipApprovalsUnavailableView />
  }

  const listInput = {
    q: search,
    sort: getSort(sort),
    status: status as
      | "approved"
      | "cancelled"
      | "pending_approval"
      | "pending_email_verification"
      | "rejected"
      | undefined,
  }
  const [filterList, signupSettings, initialTableSettings, caller] =
    await Promise.all([
      getMembershipApprovalFilterMetadata(),
      getTenantMemberSignupSettings(context.tenant.id),
      getInitialTableSettings("membershipApprovals"),
      getServerCaller(),
    ])
  const initialRequestsPage = await caller.onboarding.membershipApprovals(
    listInput
  )
  const listOptions =
    trpc.onboarding.membershipApprovals.infiniteQueryOptions(listInput, {
      getNextPageParam: ({ meta }) => meta?.cursor,
    })

  getQueryClient().setQueryData(listOptions.queryKey, {
    pageParams: [listOptions.initialPageParam],
    pages: [initialRequestsPage],
  })

  return (
    <HydrateClient>
      <MembershipApprovalsView
        approvedCount={initialRequestsPage.meta.approvedCount}
        awaitingVerificationCount={
          initialRequestsPage.meta.awaitingVerificationCount
        }
        canManage={canManage}
        filterList={filterList}
        initialTableSettings={initialTableSettings}
        pendingApprovalCount={initialRequestsPage.meta.pendingApprovalCount}
        rejectedCount={initialRequestsPage.meta.rejectedCount}
        showLinkGenerator={signupSettings.memberSignupAccessMode !== "public"}
        total={initialRequestsPage.meta.total}
      />
    </HydrateClient>
  )
}
