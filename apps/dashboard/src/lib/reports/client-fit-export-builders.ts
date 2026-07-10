import {
  getMemberShareBalancesAtDate,
  getTenantFinanceSetup,
  listContributions,
  listFoodPurchaseApplications,
  listFoodPurchaseCycles,
  listMemberOpeningBalances,
  listMemberPaymentReceipts,
  listMemberShareApplications,
  listMembers,
  listProcurementRequests,
  listProjectFinancingRequests,
  listSupportCases,
  type MemberOpeningBalanceStatus,
} from "@halaalvest/db"
import { toCsv, type ReportDateFilters } from "./csv"

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

const openingBalanceStatuses = new Set<MemberOpeningBalanceStatus>([
  "pending_review",
  "approved",
  "applied",
  "reversed",
  "rejected",
  "cancelled",
])

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

export async function buildPaymentReceiptsExportCsv(
  tenantId: string,
  filters: ReportDateFilters
) {
  const receipts = await listMemberPaymentReceipts(tenantId, {
    limit: 5000,
    submittedFrom: filters.fromDate,
    submittedTo: filters.toDate,
  })

  return toCsv(
    [
      "Receipt Id",
      "Submitted At",
      "Paid At",
      "Member",
      "Member Number",
      "Member Email",
      "Status",
      "Total Amount",
      "Channel",
      "Payment Reference",
      "Proof Document Name",
      "Proof Document Url",
      "Member Notes",
      "Reviewed At",
      "Reviewed By User Id",
      "Review Notes",
      "Allocation Id",
      "Allocation Category",
      "Allocation Amount",
      "Period Intent",
      "Target Period Start",
      "Contribution Plan Id",
      "Loan Id",
      "Procurement Schedule Item Id",
      "Foodstuff Purchase Application Id",
      "Project Financing Request Id",
      "Posted Contribution Id",
      "Posted Repayment Id",
      "Posted Share Ledger Entry Id",
      "Allocation Notes",
      "Created At",
      "Updated At",
    ],
    receipts.flatMap((receipt) =>
      receipt.allocations.map((allocation) => [
        receipt.id,
        receipt.submittedAt.toISOString(),
        receipt.paidAt.toISOString(),
        receipt.member.fullName,
        receipt.member.memberNumber,
        receipt.member.email ?? "",
        receipt.status,
        receipt.totalAmount,
        receipt.channel,
        receipt.paymentReference ?? "",
        receipt.proofDocumentName ?? "",
        receipt.proofDocumentUrl ?? "",
        receipt.memberNotes ?? "",
        receipt.reviewedAt?.toISOString() ?? "",
        receipt.reviewedByUserId ?? "",
        receipt.reviewNotes ?? "",
        allocation.id,
        allocation.category,
        allocation.amount,
        allocation.periodIntent,
        allocation.targetPeriodStart?.toISOString() ?? "",
        allocation.contributionPlanId ?? "",
        allocation.loanId ?? "",
        allocation.procurementRepaymentScheduleItemId ?? "",
        allocation.foodPurchaseApplicationId ?? "",
        allocation.projectFinancingRequestId ?? "",
        allocation.postedContributionId ?? "",
        allocation.postedRepaymentId ?? "",
        allocation.postedShareLedgerEntryId ?? "",
        allocation.notes ?? "",
        receipt.createdAt.toISOString(),
        receipt.updatedAt.toISOString(),
      ])
    )
  )
}

export async function buildFoodPurchaseExportCsv(
  tenantId: string,
  filters: ReportDateFilters
) {
  const [cycles, applications] = await Promise.all([
    listFoodPurchaseCycles({
      limit: 1000,
      tenantId,
    }),
    listFoodPurchaseApplications({
      limit: 1000,
      tenantId,
    }),
  ])
  const cycleRows = cycles
    .filter((cycle) => {
      if (filters.fromDate && cycle.releasedAt < filters.fromDate) {
        return false
      }

      if (filters.toDate && cycle.releasedAt > filters.toDate) {
        return false
      }

      return true
    })
    .map((cycle) => [
      "cycle",
      cycle.id,
      cycle.periodMonth.toISOString().slice(0, 10),
      cycle.status,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      cycle.releasedAmount,
      "",
      "",
      "",
      "",
      cycle.releasedAt.toISOString(),
      cycle.releasedByUser.fullName,
      cycle.releaseNotes ?? "",
      cycle.salesAmount ?? "",
      cycle.purchaseCostAmount ?? "",
      cycle.operatingExpenseAmount ?? "",
      cycle.profitAmount ?? "",
      cycle.accountingSubmittedByUser?.fullName ?? "",
      cycle.accountingSubmittedAt?.toISOString() ?? "",
      cycle.accountingNotes ?? "",
    ])
  const applicationRows = applications
    .filter((application) => {
      if (filters.fromDate && application.requestedAt < filters.fromDate) {
        return false
      }

      if (filters.toDate && application.requestedAt > filters.toDate) {
        return false
      }

      return true
    })
    .map((application) => {
      const approvedAmount = application.approvedAmount ?? 0
      const outstandingAmount = Math.max(
        Number(approvedAmount) - Number(application.paidAmount),
        0
      )

      return [
        "application",
        application.id,
        application.cycle.periodMonth.toISOString().slice(0, 10),
        application.status,
        application.member.fullName,
        application.member.memberNumber,
        application.itemDescription ?? "",
        application.requestedAmount,
        application.requestedPaybackMonths,
        application.approvedAmount ?? "",
        application.approvedPaybackMonths ?? "",
        application.policyMaximumPaybackMonths,
        application.allowsCommitmentReductionDuringPayback ? "yes" : "no",
        "",
        application.cycle.releasedAmount,
        application.paidAmount,
        outstandingAmount,
        application.paidAt?.toISOString() ?? "",
        application.requestedAt.toISOString(),
        application.submittedByUser.fullName,
        application.requestNotes ?? "",
        "",
        "",
        "",
        "",
        application.reviewedByUser?.fullName ?? "",
        application.reviewedAt?.toISOString() ?? "",
        application.reviewNotes ?? "",
      ]
    })

  return toCsv(
    [
      "Record Type",
      "Record Id",
      "Period Month",
      "Status",
      "Member",
      "Member Number",
      "Item Or Description",
      "Requested Amount",
      "Requested Payback Months",
      "Approved Amount",
      "Approved Payback Months",
      "Policy Max Payback Months",
      "Allows Commitment Reduction During Payback",
      "Released Amount",
      "Cycle Released Amount",
      "Paid Amount",
      "Outstanding Amount",
      "Paid At",
      "Recorded At",
      "Recorded By",
      "Notes",
      "Sales Amount",
      "Purchase Cost Amount",
      "Operating Expense Amount",
      "Profit Amount",
      "Reviewed Or Accounting By",
      "Reviewed Or Accounting At",
      "Review Or Accounting Notes",
    ],
    [...cycleRows, ...applicationRows]
  )
}

export async function buildSharePositionsExportCsv(
  tenantId: string,
  filters: ReportDateFilters
) {
  const asOfDate = filters.toDate ?? new Date()
  const [financeSetup, members, shareBalances, shareApplications] =
    await Promise.all([
      getTenantFinanceSetup(tenantId),
      listAllMembers(tenantId, {
        joinedFrom: filters.fromDate,
        joinedTo: filters.toDate,
      }),
      getMemberShareBalancesAtDate(tenantId, asOfDate),
      listMemberShareApplications({ tenantId }),
    ])
  const balanceByMemberId = new Map(
    shareBalances.map((balance) => [balance.memberId, balance.shareBalance])
  )
  const applicationTotalsByMemberId =
    buildShareApplicationTotals(shareApplications)
  const sharePolicy = financeSetup.sharePolicy
  const isUnitBased = sharePolicy.configurationMode === "unit_based"

  return toCsv(
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
}

export async function buildProcurementExportCsv(
  tenantId: string,
  filters: ReportDateFilters
) {
  const requests = await listProcurementRequests({
    limit: 1000,
    tenantId,
  })

  return toCsv(
    [
      "Request Id",
      "Requested At",
      "Member",
      "Member Number",
      "Item",
      "Vendor",
      "Status",
      "Requested Cost",
      "Requested Repayment Months",
      "Estimated Monthly Repayment",
      "Approved Cost",
      "Approved Repayment Months",
      "Approved Monthly Repayment",
      "Policy Max Payback Months",
      "Allows Commitment Reduction During Payback",
      "Purchased At",
      "Purchase Reference",
      "Purchase Notes",
      "Outstanding Amount",
      "Due Schedule Items",
      "Overdue Schedule Items",
      "Schedule Risk",
      "Repayment Schedule",
      "Reviewed By",
      "Reviewed At",
      "Review Notes",
      "Description",
      "Created By",
    ],
    requests
      .filter((procurementRequest) => {
        if (
          filters.fromDate &&
          procurementRequest.requestedAt < filters.fromDate
        ) {
          return false
        }

        if (
          filters.toDate &&
          procurementRequest.requestedAt > filters.toDate
        ) {
          return false
        }

        return true
      })
      .map((procurementRequest) => {
        const dueScheduleItems =
          procurementRequest.repaymentScheduleItems.filter(
            (item) => item.status === "due"
          ).length
        const overdueScheduleItems =
          procurementRequest.repaymentScheduleItems.filter(
            (item) => item.status === "overdue"
          ).length
        const scheduleRisk =
          overdueScheduleItems > 0
            ? "overdue"
            : dueScheduleItems > 0
              ? "due"
              : "clear"

        return [
          procurementRequest.id,
          procurementRequest.requestedAt.toISOString(),
          procurementRequest.member.fullName,
          procurementRequest.member.memberNumber,
          procurementRequest.itemName,
          procurementRequest.vendorName ?? "",
          procurementRequest.status,
          procurementRequest.requestedCost,
          procurementRequest.requestedRepaymentMonths,
          procurementRequest.estimatedMonthlyRepayment,
          procurementRequest.approvedCost ?? "",
          procurementRequest.approvedRepaymentMonths ?? "",
          procurementRequest.approvedMonthlyRepayment ?? "",
          procurementRequest.policyMaximumPaybackMonths,
          procurementRequest.allowsCommitmentReductionDuringPayback
            ? "yes"
            : "no",
          procurementRequest.purchasedAt?.toISOString() ?? "",
          procurementRequest.purchaseReference ?? "",
          procurementRequest.purchaseNotes ?? "",
          procurementRequest.outstandingAmount,
          dueScheduleItems,
          overdueScheduleItems,
          scheduleRisk,
          procurementRequest.repaymentScheduleItems
            .map(
              (item) =>
                `${item.installmentNumber}:${item.dueDate.toISOString().slice(0, 10)}:${item.amount}:${item.status}`
            )
            .join(" | "),
          procurementRequest.reviewedByUser?.fullName ?? "",
          procurementRequest.reviewedAt?.toISOString() ?? "",
          procurementRequest.reviewNotes ?? "",
          procurementRequest.itemDescription ?? "",
          procurementRequest.createdByUser.fullName,
        ]
      })
  )
}

export async function buildProjectFinancingExportCsv(
  tenantId: string,
  filters: ReportDateFilters
) {
  const requests = await listProjectFinancingRequests({
    limit: 1000,
    tenantId,
  })

  return toCsv(
    [
      "Request Id",
      "Requested At",
      "Updated At",
      "Member",
      "Member Number",
      "Business Name",
      "Status",
      "Proposed Structure",
      "Requested Amount",
      "Requested Payback Months",
      "Estimated Monthly Payback",
      "Project Purpose",
      "Business Description",
      "Approved Structure",
      "Approved Amount",
      "Approved Payback Months",
      "Approved Monthly Payback",
      "Paid Amount",
      "Outstanding Amount",
      "Paid At",
      "Disbursed At",
      "Disbursed By",
      "Disbursement Reference",
      "Disbursement Notes",
      "Reviewed By",
      "Reviewed At",
      "Review Notes",
      "Created By",
    ],
    requests
      .filter((projectRequest) => {
        if (
          filters.fromDate &&
          projectRequest.requestedAt < filters.fromDate
        ) {
          return false
        }

        if (filters.toDate && projectRequest.requestedAt > filters.toDate) {
          return false
        }

        return true
      })
      .map((projectRequest) => {
        const approvedAmount = projectRequest.approvedAmount ?? 0
        const outstandingAmount = Math.max(
          Number(approvedAmount) - Number(projectRequest.paidAmount),
          0
        )

        return [
          projectRequest.id,
          projectRequest.requestedAt.toISOString(),
          projectRequest.updatedAt.toISOString(),
          projectRequest.member.fullName,
          projectRequest.member.memberNumber,
          projectRequest.businessName,
          projectRequest.status,
          projectRequest.proposedStructure,
          projectRequest.requestedAmount,
          projectRequest.requestedPaybackMonths ?? "",
          projectRequest.estimatedMonthlyPayback ?? "",
          projectRequest.projectPurpose ?? "",
          projectRequest.businessDescription ?? "",
          projectRequest.approvedStructure ?? "",
          projectRequest.approvedAmount ?? "",
          projectRequest.approvedPaybackMonths ?? "",
          projectRequest.approvedMonthlyPayback ?? "",
          projectRequest.paidAmount,
          outstandingAmount,
          projectRequest.paidAt?.toISOString() ?? "",
          projectRequest.disbursedAt?.toISOString() ?? "",
          projectRequest.disbursedByUser?.fullName ?? "",
          projectRequest.disbursementReference ?? "",
          projectRequest.disbursementNotes ?? "",
          projectRequest.reviewedByUser?.fullName ?? "",
          projectRequest.reviewedAt?.toISOString() ?? "",
          projectRequest.reviewNotes ?? "",
          projectRequest.createdByUser.fullName,
        ]
      })
  )
}

export async function buildOpeningBalancesExportCsv({
  filters,
  memberId,
  status,
  tenantId,
}: {
  filters: ReportDateFilters
  memberId?: string
  status?: string
  tenantId: string
}) {
  const openingBalances = await listMemberOpeningBalances({
    fromDate: filters.fromDate,
    limit: 5000,
    memberId: memberId || undefined,
    status:
      status && openingBalanceStatuses.has(status as MemberOpeningBalanceStatus)
        ? (status as MemberOpeningBalanceStatus)
        : undefined,
    tenantId,
    toDate: filters.toDate,
  })

  return toCsv(
    [
      "Opening Balance Id",
      "Member",
      "Member Number",
      "Opening Date",
      "Status",
      "Commitment Savings Balance",
      "Special Savings Balance",
      "Share Capital Balance",
      "Share Units",
      "Active Financing Outstanding",
      "Procurement Outstanding",
      "Source Document Name",
      "Source Document Url",
      "Notes",
      "Reviewed At",
      "Reviewed By User Id",
      "Review Notes",
      "Applied At",
      "Applied By User Id",
      "Applied Loan Id",
      "Applied Procurement Request Id",
      "Reversed At",
      "Reversed By User Id",
      "Reversal Notes",
      "Created At",
      "Updated At",
    ],
    openingBalances.map((row) => [
      row.id,
      row.member.fullName,
      row.member.memberNumber,
      row.openingDate.toISOString(),
      row.status,
      row.commitmentSavingsBalance,
      row.specialSavingsBalance,
      row.shareCapitalBalance,
      row.shareUnits ?? "",
      row.activeFinancingOutstanding,
      row.procurementOutstanding,
      row.sourceDocumentName ?? "",
      row.sourceDocumentUrl ?? "",
      row.notes ?? "",
      row.reviewedAt?.toISOString() ?? "",
      row.reviewedByUserId ?? "",
      row.reviewNotes ?? "",
      row.appliedAt?.toISOString() ?? "",
      row.appliedByUserId ?? "",
      row.appliedLoanId ?? "",
      row.appliedProcurementRequestId ?? "",
      row.reversedAt?.toISOString() ?? "",
      row.reversedByUserId ?? "",
      row.reversalNotes ?? "",
      row.createdAt.toISOString(),
      row.updatedAt.toISOString(),
    ])
  )
}

export async function buildSupportCasesExportCsv(
  tenantId: string,
  filters: ReportDateFilters
) {
  const cases = await listSupportCases({
    fromDate: filters.fromDate,
    limit: 1000,
    tenantId,
    toDate: filters.toDate,
  })

  return toCsv(
    [
      "Created At",
      "Updated At",
      "Subject",
      "Category",
      "Status",
      "Priority",
      "Member",
      "Member Number",
      "Money Impact Requested",
      "Requires Financial Adjustment",
      "Financial Adjustment Approval",
      "Financial Adjustment Reviewer",
      "Financial Adjustment Reviewed At",
      "Financial Adjustment Notes",
      "Linked Record Type",
      "Linked Record Id",
      "Assigned To",
      "Resolution Summary",
      "Resolved At",
      "Closed At",
      "Messages",
      "Last Message At",
    ],
    cases.map((supportCase) => {
      const lastMessage = supportCase.messages.at(-1)

      return [
        supportCase.createdAt.toISOString(),
        supportCase.updatedAt.toISOString(),
        supportCase.subject,
        supportCase.category,
        supportCase.status,
        supportCase.priority,
        supportCase.member?.fullName ?? "",
        supportCase.member?.memberNumber ?? "",
        supportCase.moneyImpactRequested,
        supportCase.requiresFinancialAdjustment,
        supportCase.financialAdjustmentApprovalStatus,
        supportCase.financialAdjustmentApprovedByUser?.fullName ?? "",
        supportCase.financialAdjustmentApprovedAt?.toISOString() ?? "",
        supportCase.financialAdjustmentApprovalNotes ?? "",
        supportCase.linkedRecordType ?? "",
        supportCase.linkedRecordId ?? "",
        supportCase.assignedToUser?.fullName ?? "",
        supportCase.resolutionSummary ?? "",
        supportCase.resolvedAt?.toISOString() ?? "",
        supportCase.closedAt?.toISOString() ?? "",
        supportCase.messages.length,
        lastMessage?.createdAt.toISOString() ?? "",
      ]
    })
  )
}

export async function buildMembersRegisterExportCsv(
  tenantId: string,
  filters: ReportDateFilters
) {
  const members = await listAllMembers(tenantId, {
    joinedFrom: filters.fromDate,
    joinedTo: filters.toDate,
  })

  return toCsv(
    [
      "Member Id",
      "Member Number",
      "Full Name",
      "Email",
      "Phone Number",
      "Address",
      "Occupation",
      "Member Type",
      "Status",
      "KYC Status",
      "Joined At",
      "Exited At",
      "Deduction Source",
      "Deduction Source Type",
      "Deduction Source Reference",
      "Total Savings Snapshot",
      "Payment Allocation Preference",
      "Linked Login",
      "Linked User Email",
      "KYC Document Type",
      "KYC Document Uploaded At",
      "KYC Review Notes",
      "Created At",
      "Updated At",
    ],
    members.map((member) => [
      member.id,
      member.memberNumber,
      member.fullName,
      member.email ?? "",
      member.phoneNumber ?? "",
      member.address ?? "",
      member.occupation ?? "",
      member.memberType,
      member.status,
      member.kycStatus,
      member.joinedAt.toISOString(),
      member.exitedAt?.toISOString() ?? "",
      member.deductionSource?.name ?? "",
      member.deductionSource?.type ?? "",
      member.deductionSource?.externalReference ?? "",
      Number(member.totalSavingsSnapshot),
      member.paymentAllocationPreference,
      Boolean(member.user),
      member.user?.email ?? "",
      member.kycDocumentType ?? "",
      member.kycDocumentUploadedAt?.toISOString() ?? "",
      member.kycReviewNotes ?? "",
      member.createdAt.toISOString(),
      member.updatedAt.toISOString(),
    ])
  )
}

export async function buildSpecialSavingsExportCsv({
  filters,
  memberId,
  search,
  tenantId,
}: {
  filters: ReportDateFilters
  memberId?: string
  search?: string
  tenantId: string
}) {
  const contributions = await listContributions(tenantId, {
    fromDate: filters.fromDate,
    memberId: memberId || undefined,
    page: 1,
    pageSize: 500,
    search: search || undefined,
    specialSavingsOnly: true,
    toDate: filters.toDate,
  })

  return toCsv(
    [
      "Posted At",
      "Member",
      "Member Number",
      "Special Savings Amount",
      "Committed Amount",
      "Total Payment Amount",
      "Channel",
      "Status",
      "Period Label",
      "Reference",
    ],
    contributions.items.map((contribution) => [
      contribution.postedAt.toISOString(),
      contribution.member?.fullName ?? "",
      contribution.member?.memberNumber ?? "",
      Number(contribution.extraSavingsAmount ?? 0),
      contribution.committedAmount ? Number(contribution.committedAmount) : "",
      Number(contribution.amount),
      contribution.channel,
      contribution.status,
      contribution.periodLabel ?? "",
      contribution.reference ?? "",
    ])
  )
}
