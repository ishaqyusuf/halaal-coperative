import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import {
  type DeployableFundsSnapshot,
  getDeployableFundsSnapshot,
  getMonthlyFinancingCycleHealth,
} from "./financing-cycles"
import {
  buildContributionHealth,
  type ContributionHealth,
  getCommitmentCollection,
} from "./contribution-health"
import { getTenantOperationProfile } from "./operation-profile"
import { lateScheduleItemWhere } from "./repayments"

const activeFinancingStatuses = ["disbursed", "active"] as const
const pendingFinancingRequestStatuses = ["submitted", "under_review"] as const
const pendingMonthlyRecordStatuses = ["draft", "open"] as const
const pendingKycStatuses = ["not_started", "pending", "rejected"] as const

export type DashboardMetrics = {
  memberCount: number
  activeMemberCount: number
  activeLoanCount: number
  totalContributions: number
  outstandingLoans: number
  availablePool: number
  reserveBuffer: number
  delinquencyRate: number
}

export type OverviewSummarySeverity = "neutral" | "warning" | "critical"

export type OverviewSummary = {
  workspace: {
    tenantId: string
    tenantName: string
    currencyCode: string
    generatedAt: string
  }
  primaryMetrics: {
    deployableFunds: number
    collectionCoverage: number
    portfolioAtRiskAmount: number
    portfolioAtRiskRate: number
    actionQueueTotal: number
  }
  actionQueue: Array<{
    key: string
    label: string
    count: number
    href: string
    severity: OverviewSummarySeverity
  }>
  contributionHealth: ContributionHealth
  financingRisk: {
    outstandingPrincipal: number
    overdueAmount: number
    par30Amount: number
    par60Amount: number
    par90Amount: number
    pendingDisbursementCount: number
    financingCycleWarningCount: number
  }
  complianceWatch: Array<{
    key: string
    label: string
    count: number
    href: string
  }>
  shareAndProfitPosition: {
    shareCapitalBalance: number
    profitPendingAllocation: number
    activeInvestmentPoolCount: number
  }
  recentActivity: Array<{
    /** Money moved, or null for a request. */
    amount: number | null
    id: string
    kind: "contribution" | "loan_request" | "repayment"
    memberName: string
    label: string
    detail: string
    occurredAt: string
    href: string
  }>
  setupWarnings: Array<{
    key: string
    label: string
    href: string
  }>
}

function getCurrentMonth() {
  const now = new Date()

  return {
    month: now.getUTCMonth() + 1,
    year: now.getUTCFullYear(),
  }
}

function getFallbackPeriodLabel() {
  const { month, year } = getCurrentMonth()
  const date = new Date(Date.UTC(year, month - 1, 1))

  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date)
}

function getDaysOverdue(input: Date) {
  const today = new Date()
  const diff = today.getTime() - input.getTime()

  return Math.max(0, Math.floor(diff / 86_400_000))
}

function getEmptyOverviewSummary(input: {
  tenantId: string
  tenantName: string
  currencyCode: string
}): OverviewSummary {
  return {
    workspace: {
      tenantId: input.tenantId,
      tenantName: input.tenantName,
      currencyCode: input.currencyCode,
      generatedAt: new Date().toISOString(),
    },
    primaryMetrics: {
      deployableFunds: 0,
      collectionCoverage: 0,
      portfolioAtRiskAmount: 0,
      portfolioAtRiskRate: 0,
      actionQueueTotal: 0,
    },
    actionQueue: [],
    contributionHealth: {
      basis: "active_commitments",
      expectedThisMonth: 0,
      receivedThisMonth: 0,
      collectionGap: 0,
      paidMemberCount: 0,
      unpaidMemberCount: 0,
      periodLabel: getFallbackPeriodLabel(),
      state: "no_commitments",
    },
    financingRisk: {
      financingCycleWarningCount: 0,
      outstandingPrincipal: 0,
      overdueAmount: 0,
      par30Amount: 0,
      par60Amount: 0,
      par90Amount: 0,
      pendingDisbursementCount: 0,
    },
    complianceWatch: [],
    shareAndProfitPosition: {
      activeInvestmentPoolCount: 0,
      profitPendingAllocation: 0,
      shareCapitalBalance: 0,
    },
    recentActivity: [],
    setupWarnings: [],
  }
}

export async function getDashboardMetrics(
  tenantId: string,
  prismaOverride?: PrismaClient,
  options: {
    /** Reuse a snapshot the caller already started, to avoid a second read. */
    deployableFunds?: Promise<DeployableFundsSnapshot>
  } = {}
): Promise<DashboardMetrics> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [memberCount, activeMemberCount, activeLoanCount, deployableFunds] =
    await Promise.all([
      prisma.member.count({ where: { tenantId } }),
      prisma.member.count({ where: { tenantId, status: "active" } }),
      prisma.loan.count({
        where: { tenantId, status: { in: [...activeFinancingStatuses] } },
      }),
      options.deployableFunds ??
        getDeployableFundsSnapshot({ tenantId }, prisma),
    ])

  const totalContributions = deployableFunds.totalContributionAmount
  const outstandingLoans = deployableFunds.outstandingFinancingAmount
  const reserveBuffer = deployableFunds.reserveBufferAmount
  // Same funding model as disbursement (member funds held − outstanding −
  // reserve − billing); approved holds are subtracted by the caller.
  const availablePool = deployableFunds.availablePoolAmount

  // Delinquency: late schedule items (unpaid, due before today; read from
  // the due date, not a stored status) / all schedule items, active loans.
  const overdueScheduleCount = await prisma.repaymentScheduleItem.count({
    where: {
      tenantId,
      ...lateScheduleItemWhere(),
      loan: { status: { in: [...activeFinancingStatuses] } },
    },
  })

  const totalScheduleItems = await prisma.repaymentScheduleItem.count({
    where: {
      tenantId,
      loan: { status: { in: [...activeFinancingStatuses] } },
    },
  })

  const delinquencyRate =
    totalScheduleItems > 0 ? overdueScheduleCount / totalScheduleItems : 0

  return {
    memberCount,
    activeMemberCount,
    activeLoanCount,
    totalContributions,
    outstandingLoans,
    availablePool,
    reserveBuffer,
    delinquencyRate,
  }
}

export async function getOverviewSummary(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<OverviewSummary> {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return getEmptyOverviewSummary({
      currencyCode: "NGN",
      tenantId,
      tenantName: "Workspace",
    })
  }

  const { month, year } = getCurrentMonth()
  // The current month's record, or else the latest one still open. Rows load
  // once, for the chosen record only.
  const [tenant, candidateRecords] = await Promise.all([
    prisma.tenant.findUnique({
      select: {
        currencyCode: true,
        id: true,
        initialMigrationStatus: true,
        name: true,
      },
      where: { id: tenantId },
    }),
    prisma.monthlyRecord.findMany({
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      select: {
        id: true,
        periodLabel: true,
        periodMonth: true,
        periodYear: true,
      },
      take: 2,
      where: {
        OR: [
          { periodMonth: month, periodYear: year },
          { status: { in: [...pendingMonthlyRecordStatuses] } },
        ],
        tenantId,
      },
    }),
  ])

  if (!tenant) {
    return getEmptyOverviewSummary({
      currencyCode: "NGN",
      tenantId,
      tenantName: "Workspace",
    })
  }

  const currentMonthlyRecord =
    candidateRecords.find(
      (record) => record.periodMonth === month && record.periodYear === year
    ) ??
    candidateRecords[0] ??
    null

  const deployableFundsSnapshot = getDeployableFundsSnapshot({ tenantId }, prisma)
  const [
    deployableFundsForOverview,
    monthlyRows,
    pendingMemberApprovals,
    kycReviewCount,
    pendingDocumentReviews,
    financingApprovalCount,
    pendingDisbursementCount,
    pendingShareApplications,
    pendingOpeningBalances,
    pendingProcurementRequests,
    pendingProjectFinancingRequests,
    pendingFoodPurchaseApplications,
    submittedFoodPurchaseAccounting,
    pendingPaymentReceipts,
    openSupportCases,
    failedImportCount,
    overdueScheduleItems,
    activeShareBusinesses,
    shareLedgerBalance,
    pendingProfitEntries,
    pendingShareAllocations,
    draftDividendPeriods,
    latestContributions,
    latestRepayments,
    latestLoanRequests,
    financingCycleHealth,
    operationProfile,
  ] = await Promise.all([
    deployableFundsSnapshot,
    currentMonthlyRecord
      ? prisma.monthlyRecordMember.findMany({
          select: {
            calculatedPayableAmount: true,
            status: true,
            totalPaidAmount: true,
          },
          where: { monthlyRecordId: currentMonthlyRecord.id, tenantId },
        })
      : Promise.resolve([]),
    prisma.memberOnboardingRequest.count({
      where: { status: "pending_approval", tenantId },
    }),
    prisma.member.count({
      where: {
        kycStatus: { in: [...pendingKycStatuses] },
        status: "active",
        tenantId,
      },
    }),
    prisma.memberDocument.count({
      where: { reviewStatus: "pending", tenantId },
    }),
    prisma.loanRequest.count({
      where: {
        status: { in: [...pendingFinancingRequestStatuses] },
        tenantId,
      },
    }),
    prisma.loan.count({ where: { status: "approved", tenantId } }),
    prisma.memberShareApplication.count({
      where: { status: "pending", tenantId },
    }),
    typeof (prisma as any).memberOpeningBalance?.count === "function"
      ? (prisma as any).memberOpeningBalance.count({
          where: { status: "pending_review", tenantId },
        })
      : 0,
    prisma.procurementRequest.count({
      where: { status: { in: ["submitted", "under_review"] }, tenantId },
    }),
    typeof (prisma as any).projectFinancingRequest?.count === "function"
      ? (prisma as any).projectFinancingRequest.count({
          where: { status: { in: ["submitted", "under_review"] }, tenantId },
        })
      : 0,
    typeof (prisma as any).foodPurchaseApplication?.count === "function"
      ? (prisma as any).foodPurchaseApplication.count({
          where: { status: { in: ["submitted", "under_review"] }, tenantId },
        })
      : 0,
    typeof (prisma as any).foodPurchaseCycle?.count === "function"
      ? (prisma as any).foodPurchaseCycle.count({
          where: { status: "accounting_submitted", tenantId },
        })
      : 0,
    prisma.memberPaymentReceipt.count({
      where: { status: { in: ["submitted", "under_review"] }, tenantId },
    }),
    prisma.supportCase.count({
      where: {
        status: { in: ["open", "in_progress", "waiting_on_member"] },
        tenantId,
      },
    }),
    prisma.importBatch.count({ where: { status: "failed", tenantId } }),
    prisma.repaymentScheduleItem.findMany({
      select: {
        dueAt: true,
        principalDue: true,
        totalDue: true,
      },
      where: {
        loan: { status: { in: [...activeFinancingStatuses] } },
        ...lateScheduleItemWhere(),
        tenantId,
      },
    }),
    prisma.shareBusiness.count({
      where: { status: "active", tenantId },
    }),
    prisma.memberShareLedgerEntry.aggregate({
      _sum: { amount: true },
      where: { tenantId },
    }),
    prisma.shareBusinessProfitEntry.aggregate({
      _sum: { allocatableProfitAmount: true },
      where: { status: { in: ["draft", "reviewed"] }, tenantId },
    }),
    prisma.shareProfitAllocation.aggregate({
      _sum: { allocatedProfitAmount: true },
      where: { status: "draft", tenantId },
    }),
    prisma.dividendPeriod.count({
      where: { status: "draft", tenantId },
    }),
    prisma.contribution.findMany({
      orderBy: { postedAt: "desc" },
      select: {
        id: true,
        memberId: true,
        postedAt: true,
        amount: true,
      },
      take: 3,
      where: { status: "posted", tenantId },
    }),
    prisma.repayment.findMany({
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        memberId: true,
        paidAt: true,
        amount: true,
      },
      take: 3,
      where: { status: "posted", tenantId },
    }),
    prisma.loanRequest.findMany({
      orderBy: { requestedAt: "desc" },
      select: {
        id: true,
        memberId: true,
        requestedAt: true,
        status: true,
      },
      take: 3,
      where: { tenantId },
    }),
    getMonthlyFinancingCycleHealth({ tenantId }, prisma, {
      deployableFunds: deployableFundsSnapshot,
    }),
    getTenantOperationProfile(tenantId, prisma),
  ])

  const activityMemberIds = [
    ...new Set(
      [...latestContributions, ...latestRepayments, ...latestLoanRequests]
        .map((row) => row.memberId)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const activityMemberNames = new Map(
    activityMemberIds.length > 0
      ? (
          await prisma.member.findMany({
            select: { fullName: true, id: true },
            where: { id: { in: activityMemberIds }, tenantId },
          })
        ).map((member) => [member.id, member.fullName])
      : []
  )
  const memberName = (memberId: string | null) =>
    (memberId ? activityMemberNames.get(memberId) : null) ?? "A member"

  // Without a monthly record, estimate from active commitments and this
  // month's posted contributions instead of all-time totals (F22).
  const contributionHealth = buildContributionHealth({
    commitments:
      monthlyRows.length > 0
        ? null
        : await getCommitmentCollection(tenantId, { month, year }, prisma),
    monthlyRows,
    periodLabel: currentMonthlyRecord?.periodLabel ?? getFallbackPeriodLabel(),
  })
  const { collectionGap, expectedThisMonth, receivedThisMonth } =
    contributionHealth
  const collectionCoverage =
    expectedThisMonth > 0 ? receivedThisMonth / expectedThisMonth : 0
  const overdueAmount = overdueScheduleItems.reduce(
    (total, item) => total + Number(item.totalDue),
    0
  )
  const par30Amount = overdueScheduleItems.reduce(
    (total, item) =>
      total +
      (getDaysOverdue(item.dueAt) >= 30 ? Number(item.principalDue) : 0),
    0
  )
  const par60Amount = overdueScheduleItems.reduce(
    (total, item) =>
      total +
      (getDaysOverdue(item.dueAt) >= 60 ? Number(item.principalDue) : 0),
    0
  )
  const par90Amount = overdueScheduleItems.reduce(
    (total, item) =>
      total +
      (getDaysOverdue(item.dueAt) >= 90 ? Number(item.principalDue) : 0),
    0
  )
  // One snapshot feeds disbursement, Loans, mobile and this overview.
  const deployableFunds = financingCycleHealth.deployableFunds.deployableFunds
  const portfolioAtRiskRate =
    deployableFundsForOverview.outstandingFinancingAmount > 0
      ? overdueAmount / deployableFundsForOverview.outstandingFinancingAmount
      : 0
  const pendingProfitAmount =
    Number(pendingProfitEntries._sum.allocatableProfitAmount ?? 0) +
    Number(pendingShareAllocations._sum.allocatedProfitAmount ?? 0)
  const setupWarnings =
    tenant.initialMigrationStatus === "finalized" ||
    tenant.initialMigrationStatus === "live_operations"
      ? []
      : [
          {
            href: "/getting-started",
            key: "initial-migration",
            label: "Initial migration is not finalized",
          },
        ]
  const actionQueue = [
    {
      count: pendingMemberApprovals,
      href: "/membership-approvals?status=pending_approval",
      key: "membership-approvals",
      label: "Membership approvals",
      severity: "warning" as const,
    },
    {
      count: kycReviewCount + pendingDocumentReviews,
      href: "/members?kycStatus=pending",
      key: "kyc-documents",
      label: "KYC and document reviews",
      severity: "warning" as const,
    },
    {
      count: financingApprovalCount,
      href: "/loans",
      key: "financing-approvals",
      label: "Financing approvals",
      severity: "warning" as const,
    },
    {
      count: pendingDisbursementCount,
      href: "/loans",
      key: "disbursement-holds",
      label: "Disbursement holds",
      severity: "critical" as const,
    },
    {
      count: pendingShareApplications,
      href: "/settings/finance/shares",
      key: "share-applications",
      label: "Share applications",
      severity: "warning" as const,
    },
    {
      count: pendingOpeningBalances,
      href: "/members",
      key: "opening-balances",
      label: "Opening balance reviews",
      severity: "warning" as const,
    },
    {
      count: pendingProcurementRequests,
      href: "/procurement",
      key: "procurement-requests",
      label: "Procurement requests",
      severity: "warning" as const,
    },
    {
      count: pendingProjectFinancingRequests,
      href: "/project-financing",
      key: "project-financing-requests",
      label: "Project financing requests",
      severity: "warning" as const,
    },
    {
      count: pendingFoodPurchaseApplications,
      href: "/food-purchase",
      key: "food-purchase-applications",
      label: "Foodstuff Purchase applications",
      severity: "warning" as const,
    },
    {
      count: submittedFoodPurchaseAccounting,
      href: "/food-purchase",
      key: "food-purchase-accounting",
      label: "Foodstuff Purchase accounting",
      severity: "warning" as const,
    },
    {
      count: pendingPaymentReceipts,
      href: "/payment-receipts",
      key: "payment-receipts",
      label: "Payment receipts",
      severity: "warning" as const,
    },
    {
      count: openSupportCases,
      href: "/support",
      key: "support-cases",
      label: "Support cases",
      severity: "warning" as const,
    },
    {
      count: financingCycleHealth.warnings.length,
      href: "/loans",
      key: "financing-cycle-warnings",
      label: "Financing cycle warnings",
      severity: financingCycleHealth.warnings.some(
        (warning) => warning.severity === "critical"
      )
        ? ("critical" as const)
        : ("warning" as const),
    },
    {
      count: overdueScheduleItems.length,
      href: "/repayments?view=schedule&scheduleStatus=overdue",
      key: "overdue-follow-ups",
      label: "Overdue follow-ups",
      severity: "critical" as const,
    },
    {
      count: failedImportCount,
      href: "/settings/imports/batches",
      key: "failed-imports",
      label: "Failed imports",
      severity: "critical" as const,
    },
    {
      count: draftDividendPeriods + Number(pendingProfitAmount > 0),
      href: "/settings/finance/business",
      key: "profit-review",
      label: "Profit or dividend items pending review",
      severity: "warning" as const,
    },
    {
      count: setupWarnings.length,
      href: "/getting-started",
      key: "setup-warnings",
      label: "Setup warnings",
      severity: "neutral" as const,
    },
  ].filter((item) => {
    if (item.key === "procurement-requests") {
      return (
        operationProfile.services.procurement.shouldShowInStaffNav ||
        item.count > 0
      )
    }

    if (
      item.key === "food-purchase-applications" ||
      item.key === "food-purchase-accounting"
    ) {
      return (
        operationProfile.services.food_purchase.shouldShowInStaffNav ||
        item.count > 0
      )
    }

    if (item.key === "payment-receipts") {
      return (
        operationProfile.services.payment_receipts.shouldShowInStaffNav ||
        item.count > 0
      )
    }

    if (item.key === "support-cases") {
      return (
        operationProfile.services.support_cases.shouldShowInStaffNav ||
        item.count > 0
      )
    }

    return true
  })

  const recentActivity = [
    ...latestContributions.map((contribution) => ({
      amount: Number(contribution.amount),
      detail: `${memberName(contribution.memberId)} paid ${Number(contribution.amount).toLocaleString("en-NG")}`,
      kind: "contribution" as const,
      memberName: memberName(contribution.memberId),
      href: "/contributions",
      id: `contribution-${contribution.id}`,
      label: "Contribution posted",
      occurredAt: contribution.postedAt.toISOString(),
    })),
    ...latestRepayments.map((repayment) => ({
      amount: Number(repayment.amount),
      detail: `${memberName(repayment.memberId)} repaid ${Number(repayment.amount).toLocaleString("en-NG")}`,
      kind: "repayment" as const,
      memberName: memberName(repayment.memberId),
      href: "/repayments",
      id: `repayment-${repayment.id}`,
      label: "Repayment posted",
      occurredAt: repayment.paidAt.toISOString(),
    })),
    ...latestLoanRequests.map((request) => ({
      amount: null,
      detail: `${memberName(request.memberId)} · ${request.status.replace(/_/g, " ")}`,
      kind: "loan_request" as const,
      memberName: memberName(request.memberId),
      href: "/loans",
      id: `loan-request-${request.id}`,
      label: "Financing request updated",
      occurredAt: request.requestedAt.toISOString(),
    })),
  ]
    .sort((first, second) => second.occurredAt.localeCompare(first.occurredAt))
    .slice(0, 6)

  return {
    workspace: {
      currencyCode: tenant.currencyCode,
      generatedAt: new Date().toISOString(),
      tenantId,
      tenantName: tenant.name,
    },
    primaryMetrics: {
      actionQueueTotal: actionQueue.reduce(
        (total, item) => total + item.count,
        0
      ),
      collectionCoverage,
      deployableFunds,
      portfolioAtRiskAmount: overdueAmount,
      portfolioAtRiskRate,
    },
    actionQueue,
    contributionHealth,
    financingRisk: {
      financingCycleWarningCount: financingCycleHealth.warnings.length,
      outstandingPrincipal:
        deployableFundsForOverview.outstandingFinancingAmount,
      overdueAmount,
      par30Amount,
      par60Amount,
      par90Amount,
      pendingDisbursementCount,
    },
    complianceWatch: [
      {
        count: kycReviewCount,
        href: "/members?kycStatus=pending",
        key: "kyc-incomplete",
        label: "Members with incomplete KYC",
      },
      {
        count: pendingDocumentReviews,
        href: "/members",
        key: "document-review",
        label: "Documents pending review",
      },
      {
        count: draftDividendPeriods + Number(pendingProfitAmount > 0),
        href: "/settings/finance/business",
        key: "profit-review",
        label: "Profit or dividend items pending review",
      },
    ],
    recentActivity,
    setupWarnings,
    shareAndProfitPosition: {
      activeInvestmentPoolCount: activeShareBusinesses,
      profitPendingAllocation: pendingProfitAmount,
      shareCapitalBalance: Number(shareLedgerBalance._sum.amount ?? 0),
    },
  }
}
