import {
  getMemberShareBalancesAtDate,
  getTenantFinanceSetup,
  listMemberShareApplications,
  listMembers,
} from "@halaalvest/db"
import {
  createCsvResponse,
  getReportsDateFilters,
  requireReportsExportContext,
  toCsv,
} from "../export-utils"

type MemberListFilters = NonNullable<Parameters<typeof listMembers>[1]>
type MemberListResult = Awaited<ReturnType<typeof listMembers>>
type MemberRow = MemberListResult["items"][number]
type ShareApplicationRow = Awaited<
  ReturnType<typeof listMemberShareApplications>
>[number]

type ShareApplicationTotals = {
  approvedOptionalUnits: number
  approvedRequestCount: number
  cancelledRequestCount: number
  latestStatus: string
  pendingOptionalUnits: number
  pendingRequestCount: number
  rejectedRequestCount: number
}

async function listAllMembers(tenantId: string, filters: MemberListFilters) {
  const pageSize = 500
  const members: MemberRow[] = []
  let page = 1

  while (true) {
    const result = await listMembers(tenantId, {
      ...filters,
      page,
      pageSize,
    })

    members.push(...result.items)

    if (members.length >= result.total || result.items.length === 0) {
      return members
    }

    page += 1
  }
}

function emptyShareTotals(): ShareApplicationTotals {
  return {
    approvedOptionalUnits: 0,
    approvedRequestCount: 0,
    cancelledRequestCount: 0,
    latestStatus: "",
    pendingOptionalUnits: 0,
    pendingRequestCount: 0,
    rejectedRequestCount: 0,
  }
}

function buildShareApplicationTotals(applications: ShareApplicationRow[]) {
  const totalsByMemberId = new Map<string, ShareApplicationTotals>()

  for (const application of applications) {
    const totals =
      totalsByMemberId.get(application.memberId) ?? emptyShareTotals()

    if (!totals.latestStatus) {
      totals.latestStatus = application.status
    }

    if (application.status === "approved") {
      totals.approvedOptionalUnits +=
        application.approvedUnits ?? application.requestedUnits
      totals.approvedRequestCount += 1
    }

    if (application.status === "pending") {
      totals.pendingOptionalUnits += application.requestedUnits
      totals.pendingRequestCount += 1
    }

    if (application.status === "rejected") {
      totals.rejectedRequestCount += 1
    }

    if (application.status === "cancelled") {
      totals.cancelledRequestCount += 1
    }

    totalsByMemberId.set(application.memberId, totals)
  }

  return totalsByMemberId
}

export async function GET(request: Request) {
  const context = await requireReportsExportContext()

  if (!context?.tenant) {
    return new Response("Unauthorized", { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filters = getReportsDateFilters(
    Object.fromEntries(searchParams.entries())
  )
  const asOfDate = filters.toDate ?? new Date()
  const [financeSetup, members, shareBalances, shareApplications] =
    await Promise.all([
      getTenantFinanceSetup(context.tenant.id),
      listAllMembers(context.tenant.id, {
        joinedFrom: filters.fromDate,
        joinedTo: filters.toDate,
      }),
      getMemberShareBalancesAtDate(context.tenant.id, asOfDate),
      listMemberShareApplications({ tenantId: context.tenant.id }),
    ])
  const balanceByMemberId = new Map(
    shareBalances.map((balance) => [balance.memberId, balance.shareBalance])
  )
  const applicationTotalsByMemberId =
    buildShareApplicationTotals(shareApplications)
  const sharePolicy = financeSetup.sharePolicy
  const isUnitBased = sharePolicy.configurationMode === "unit_based"
  const csv = toCsv(
    [
      "Member Id",
      "Member Number",
      "Member",
      "Email",
      "Status",
      "Joined At",
      "Share Model",
      "Share Balance",
      "Unit Amount",
      "Compulsory Units",
      "Approved Optional Units",
      "Pending Optional Units",
      "Total Approved Units",
      "Total Pending Units",
      "Total Approved Unit Value",
      "Total Pending Unit Value",
      "Pending Share Requests",
      "Approved Share Requests",
      "Rejected Share Requests",
      "Cancelled Share Requests",
      "Latest Share Request Status",
      "As Of",
    ],
    members.map((member) => {
      const applicationTotals =
        applicationTotalsByMemberId.get(member.id) ?? emptyShareTotals()
      const compulsoryUnits = isUnitBased
        ? sharePolicy.compulsoryShareUnits
        : null
      const approvedOptionalUnits = isUnitBased
        ? applicationTotals.approvedOptionalUnits
        : null
      const pendingOptionalUnits = isUnitBased
        ? applicationTotals.pendingOptionalUnits
        : null
      const totalApprovedUnits = isUnitBased
        ? sharePolicy.compulsoryShareUnits +
          applicationTotals.approvedOptionalUnits
        : null
      const totalPendingUnits =
        isUnitBased && totalApprovedUnits != null
          ? totalApprovedUnits + applicationTotals.pendingOptionalUnits
          : null

      return [
        member.id,
        member.memberNumber,
        member.fullName,
        member.email ?? "",
        member.status,
        member.joinedAt.toISOString(),
        sharePolicy.configurationMode,
        balanceByMemberId.get(member.id) ?? 0,
        isUnitBased ? sharePolicy.unitAmount : "",
        compulsoryUnits ?? "",
        approvedOptionalUnits ?? "",
        pendingOptionalUnits ?? "",
        totalApprovedUnits ?? "",
        totalPendingUnits ?? "",
        totalApprovedUnits != null
          ? totalApprovedUnits * sharePolicy.unitAmount
          : "",
        totalPendingUnits != null
          ? totalPendingUnits * sharePolicy.unitAmount
          : "",
        applicationTotals.pendingRequestCount,
        applicationTotals.approvedRequestCount,
        applicationTotals.rejectedRequestCount,
        applicationTotals.cancelledRequestCount,
        applicationTotals.latestStatus,
        asOfDate.toISOString(),
      ]
    })
  )

  return createCsvResponse(`${context.tenant.slug}-share-positions.csv`, csv)
}
