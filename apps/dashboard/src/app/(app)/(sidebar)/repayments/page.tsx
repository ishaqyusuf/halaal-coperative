import {
  createDbRuntime,
  getRepaymentFilterMetadata,
  listLoans,
  listRepaymentScheduleItems,
  listRepayments,
  listTenantUsersWithMemberships,
} from "@halaalvest/db"
import {
  RepaymentsPageView,
  RepaymentsUnavailableView,
} from "@/components/repayments-page-view"
import { loadRepaymentParams } from "@/hooks/use-repayment-params"
import { loadRepaymentsFilterParams } from "@/hooks/use-repayments-filter-params"
import {
  canShowQuickFill,
  getDashboardPageData,
  getDashboardServerContext,
} from "@/lib/server-context"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  const constructorName = (value as { constructor?: { name?: string } } | null)
    ?.constructor?.name

  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toNumber?: unknown }).toNumber === "function" &&
    typeof (value as { toFixed?: unknown }).toFixed === "function" &&
    typeof constructorName === "string" &&
    constructorName.startsWith("Decimal")
  )
}

function toClientValue<T>(value: T): T {
  if (isDecimalLike(value)) {
    return value.toNumber() as T
  }

  if (value instanceof Date) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => toClientValue(item)) as T
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toClientValue(item)])
    ) as T
  }

  return value
}

export default async function RepaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const params = loadRepaymentsFilterParams(resolvedSearchParams)
  loadRepaymentParams(resolvedSearchParams)
  const { dashboard } = await getDashboardPageData()
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const assignedToUserId = params.assignedToUserId ?? ""
  const memberId = params.memberId ?? ""
  const resolutionStatus = params.resolutionStatus ?? ""
  const scheduleStatus = params.scheduleStatus ?? ""
  const stage = params.stage ?? ""
  const from = params.from ?? ""
  const to = params.to ?? ""

  if (!context.tenant || runtime.status !== "database-configured") {
    return <RepaymentsUnavailableView />
  }

  const [
    filterList,
    rawLoans,
    rawScheduleItems,
    rawRepayments,
    tenantUsers,
  ] = await Promise.all([
    getRepaymentFilterMetadata(context.tenant.id),
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
  const loans = toClientValue(rawLoans)
  const scheduleItems = toClientValue(rawScheduleItems)
  const repayments = toClientValue(rawRepayments)

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

  return <RepaymentsPageView assignedToUserId={assignedToUserId} assignees={assignees} canPostRepayment={canPostRepayment} dashboard={dashboard} escalatedItems={escalatedItems} filterList={filterList} from={from} highPriorityItems={highPriorityItems} loans={loans} memberId={memberId} openCases={openCases} overdueItems={overdueItems} promiseTrackingItems={promiseTrackingItems} quickFillEnabled={canShowQuickFill(context)} repayments={repayments} resolutionStatus={resolutionStatus} resolvedCases={resolvedCases} scheduleItems={scheduleItems} scheduleStatus={scheduleStatus} stage={stage} to={to} uniqueMembers={uniqueMembers} />
}
