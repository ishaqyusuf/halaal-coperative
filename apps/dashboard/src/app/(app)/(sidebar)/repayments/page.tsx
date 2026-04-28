import { createDbRuntime, listLoans, listRepaymentScheduleItems, listRepayments, listTenantUsersWithMemberships } from "@halaal-vest/db"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { RepaymentsPageView } from "@/components/repayments-page-view"
import { getDashboardPageData, getDashboardServerContext } from "@/lib/server-context"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"

export default async function RepaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { dashboard } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const assignedToUserId = typeof params.assignedToUserId === "string" ? params.assignedToUserId : ""
  const memberId = typeof params.memberId === "string" ? params.memberId : ""
  const resolutionStatus = typeof params.resolutionStatus === "string" ? params.resolutionStatus : ""
  const scheduleStatus = typeof params.scheduleStatus === "string" ? params.scheduleStatus : ""
  const stage = typeof params.stage === "string" ? params.stage : ""
  const from = typeof params.from === "string" ? params.from : ""
  const to = typeof params.to === "string" ? params.to : ""

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell eyebrow="Repayments" title="Repayment tracking" description="Track overdue exposure, repayment progress, and the collections workflow from one route.">
        <WorkspaceEmptyState title="Repayment workflows need the database runtime." body="Once the database-backed environment is active, this route will manage schedule items, repayment posting, and collections follow-up." />
      </WorkspacePageShell>
    )
  }

  const [loans, scheduleItems, repayments, tenantUsers] = await Promise.all([
    listLoans(context.tenant.id),
    listRepaymentScheduleItems(context.tenant.id, {
      assignedToUserId: assignedToUserId || undefined,
      fromDate: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
      memberId: memberId || undefined,
      resolutionStatus: resolutionStatus || undefined,
      stage: stage || undefined,
      status: scheduleStatus ? (scheduleStatus as "due" | "overdue" | "paid" | "partially_paid" | "pending") : undefined,
      toDate: to ? new Date(`${to}T23:59:59.999Z`) : undefined,
    }),
    listRepayments(context.tenant.id),
    listTenantUsersWithMemberships(context.tenant.id),
  ])

  const uniqueMembers = Array.from(new Map(loans.map((loan) => [loan.member.id, loan.member])).values())
  const assignees = tenantUsers
    .filter((user) => user.memberships.some((membership) => ["super_admin", "tenant_admin", "finance_officer", "operations_officer"].includes(membership.role)))
    .map((user) => ({ id: user.id, label: `${user.fullName} (${user.email})` }))
  const canPostRepayment = hasAnyRole(context.auth.membership?.role, financeManagementRoles)
  const overdueItems = scheduleItems.filter((item) => item.status === "overdue")
  const openCases = overdueItems.filter((item) => item.collectionFollowUps[0]?.resolutionStatus !== "resolved")
  const promiseTrackingItems = overdueItems.filter((item) => item.collectionFollowUps[0]?.caseStage === "promise_tracking")
  const escalatedItems = overdueItems.filter((item) => item.collectionFollowUps[0]?.caseStage === "escalated")
  const highPriorityItems = overdueItems.filter((item) => item.collectionFollowUps[0]?.priority === "high")
  const resolvedCases = overdueItems.filter((item) => item.collectionFollowUps[0]?.resolutionStatus === "resolved")

  return <RepaymentsPageView assignedToUserId={assignedToUserId} assignees={assignees} canPostRepayment={canPostRepayment} dashboard={dashboard} escalatedItems={escalatedItems} from={from} highPriorityItems={highPriorityItems} loans={loans} memberId={memberId} openCases={openCases} overdueItems={overdueItems} promiseTrackingItems={promiseTrackingItems} repayments={repayments} resolutionStatus={resolutionStatus} resolvedCases={resolvedCases} scheduleItems={scheduleItems} scheduleStatus={scheduleStatus} stage={stage} to={to} uniqueMembers={uniqueMembers} />
}
