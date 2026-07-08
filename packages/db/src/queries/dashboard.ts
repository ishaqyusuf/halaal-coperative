import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { getMonthlyFinancingCycleHealth } from "./financing-cycles"

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
  contributionHealth: {
    expectedThisMonth: number
    receivedThisMonth: number
    collectionGap: number
    paidMemberCount: number
    unpaidMemberCount: number
    periodLabel: string
  }
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
    id: string
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
      expectedThisMonth: 0,
      receivedThisMonth: 0,
      collectionGap: 0,
      paidMemberCount: 0,
      unpaidMemberCount: 0,
      periodLabel: getFallbackPeriodLabel(),
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
  prismaOverride?: PrismaClient
): Promise<DashboardMetrics> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [
    memberCount,
    activeMemberCount,
    activeLoanCount,
    contributionSum,
    outstandingLoanSum,
    policy,
  ] = await Promise.all([
    prisma.member.count({ where: { tenantId } }),
    prisma.member.count({ where: { tenantId, status: "active" } }),
    prisma.loan.count({
      where: { tenantId, status: { in: [...activeFinancingStatuses] } },
    }),
    prisma.contribution.aggregate({
      where: { tenantId, status: "posted" },
      _sum: { amount: true },
    }),
    prisma.loan.aggregate({
      where: { tenantId, status: { in: [...activeFinancingStatuses] } },
      _sum: { outstandingPrincipal: true },
    }),
    prisma.tenantPolicy.findUnique({ where: { tenantId } }),
  ])

  const totalContributions = Number(contributionSum._sum.amount ?? 0)
  const outstandingLoans = Number(
    outstandingLoanSum._sum.outstandingPrincipal ?? 0
  )
  const reserveBuffer = Number(policy?.reserveBufferAmount ?? 0)
  const availablePool = Math.max(
    0,
    totalContributions - outstandingLoans - reserveBuffer
  )

  // Delinquency: loans with overdue schedule items / total active loans
  const overdueScheduleCount = await prisma.repaymentScheduleItem.count({
    where: {
      tenantId,
      status: "overdue",
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
  const tenant = await prisma.tenant.findUnique({
    select: {
      currencyCode: true,
      id: true,
      initialMigrationStatus: true,
      name: true,
    },
    where: { id: tenantId },
  })

  if (!tenant) {
    return getEmptyOverviewSummary({
      currencyCode: "NGN",
      tenantId,
      tenantName: "Workspace",
    })
  }

  const currentMonthlyRecord =
    (await prisma.monthlyRecord.findFirst({
      include: {
        memberRows: {
          select: {
            calculatedPayableAmount: true,
            status: true,
            totalPaidAmount: true,
          },
        },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      where: {
        periodMonth: month,
        periodYear: year,
        tenantId,
      },
    })) ??
    (await prisma.monthlyRecord.findFirst({
      include: {
        memberRows: {
          select: {
            calculatedPayableAmount: true,
            status: true,
            totalPaidAmount: true,
          },
        },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      where: {
        status: { in: [...pendingMonthlyRecordStatuses] },
        tenantId,
      },
    }))

  const [
    metrics,
    pendingMemberApprovals,
    kycReviewCount,
    pendingDocumentReviews,
    financingApprovalCount,
    pendingDisbursementCount,
    failedImportCount,
    overdueScheduleItems,
    approvedCommitments,
    activeShareBusinesses,
    shareLedgerBalance,
    pendingProfitEntries,
    pendingShareAllocations,
    draftDividendPeriods,
    latestContributions,
    latestRepayments,
    latestLoanRequests,
    financingCycleHealth,
  ] = await Promise.all([
    getDashboardMetrics(tenantId, prisma),
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
    prisma.importBatch.count({ where: { status: "failed", tenantId } }),
    prisma.repaymentScheduleItem.findMany({
      select: {
        dueAt: true,
        principalDue: true,
        totalDue: true,
      },
      where: {
        loan: { status: { in: [...activeFinancingStatuses] } },
        status: "overdue",
        tenantId,
      },
    }),
    prisma.loan.aggregate({
      _sum: { principalAmount: true },
      where: { status: "approved", tenantId },
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
      include: {
        member: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { postedAt: "desc" },
      take: 3,
      where: { status: "posted", tenantId },
    }),
    prisma.repayment.findMany({
      include: {
        member: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { paidAt: "desc" },
      take: 3,
      where: { status: "posted", tenantId },
    }),
    prisma.loanRequest.findMany({
      include: {
        member: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { requestedAt: "desc" },
      take: 3,
      where: { tenantId },
    }),
    getMonthlyFinancingCycleHealth({ tenantId }, prisma),
  ])

  const monthlyRows = currentMonthlyRecord?.memberRows ?? []
  const expectedThisMonth =
    monthlyRows.length > 0
      ? monthlyRows.reduce(
          (total, row) => total + Number(row.calculatedPayableAmount),
          0
        )
      : metrics.totalContributions
  const receivedThisMonth =
    monthlyRows.length > 0
      ? monthlyRows.reduce(
          (total, row) => total + Number(row.totalPaidAmount),
          0
        )
      : metrics.totalContributions
  const paidMemberCount =
    monthlyRows.length > 0
      ? monthlyRows.filter(
          (row) => row.status === "applied" && Number(row.totalPaidAmount) > 0
        ).length
      : metrics.activeMemberCount
  const unpaidMemberCount =
    monthlyRows.length > 0
      ? monthlyRows.filter(
          (row) =>
            row.status !== "cancelled" && Number(row.totalPaidAmount) <= 0
        ).length
      : 0
  const collectionCoverage =
    expectedThisMonth > 0 ? receivedThisMonth / expectedThisMonth : 0
  const collectionGap = Math.max(0, expectedThisMonth - receivedThisMonth)
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
  const pendingCommitmentAmount = Number(
    approvedCommitments._sum.principalAmount ?? 0
  )
  const deployableFunds = Math.max(
    0,
    metrics.totalContributions -
      metrics.outstandingLoans -
      metrics.reserveBuffer -
      pendingCommitmentAmount
  )
  const portfolioAtRiskRate =
    metrics.outstandingLoans > 0 ? overdueAmount / metrics.outstandingLoans : 0
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
      href: "/repayments?status=overdue",
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
      count: setupWarnings.length,
      href: "/getting-started",
      key: "setup-warnings",
      label: "Setup warnings",
      severity: "neutral" as const,
    },
  ]

  const recentActivity = [
    ...latestContributions.map((contribution) => ({
      detail: `${contribution.member?.fullName ?? "Unknown member"} posted ${Number(contribution.amount).toLocaleString("en-NG")}`,
      href: "/contributions",
      id: `contribution-${contribution.id}`,
      label: "Contribution posted",
      occurredAt: contribution.postedAt.toISOString(),
    })),
    ...latestRepayments.map((repayment) => ({
      detail: `${repayment.member?.fullName ?? "Unknown member"} repaid ${Number(repayment.amount).toLocaleString("en-NG")}`,
      href: "/repayments",
      id: `repayment-${repayment.id}`,
      label: "Repayment posted",
      occurredAt: repayment.paidAt.toISOString(),
    })),
    ...latestLoanRequests.map((request) => ({
      detail: `${request.member?.fullName ?? "Unknown member"} · ${request.status.replace(/_/g, " ")}`,
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
    contributionHealth: {
      collectionGap,
      expectedThisMonth,
      paidMemberCount,
      periodLabel:
        currentMonthlyRecord?.periodLabel ?? getFallbackPeriodLabel(),
      receivedThisMonth,
      unpaidMemberCount,
    },
    financingRisk: {
      financingCycleWarningCount: financingCycleHealth.warnings.length,
      outstandingPrincipal: metrics.outstandingLoans,
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
