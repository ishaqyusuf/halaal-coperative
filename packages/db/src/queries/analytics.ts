import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { getOverviewSummary } from "./dashboard"

const activeFinancingStatuses = ["disbursed", "active"] as const
const riskScheduleStatuses = [
  "pending",
  "due",
  "partially_paid",
  "overdue",
] as const
const pendingKycStatuses = ["not_started", "pending", "rejected"] as const

export type AnalyticsPeriod =
  | "current_month"
  | "last_3_months"
  | "last_6_months"
  | "last_12_months"

export type AnalyticsSummary = {
  workspace: {
    tenantId: string
    tenantName: string
    currencyCode: string
    generatedAt: string
    periodLabel: string
  }
  primaryMetrics: {
    deployableFunds: number
    collectionCoverage: number
    portfolioAtRiskRate: number
    actionQueueTotal: number
    pendingDisbursementAmount: number
  }
  contributionAnalytics: {
    expectedThisMonth: number
    receivedThisMonth: number
    collectionGap: number
    paidMemberCount: number
    unpaidMemberCount: number
    stagedMemberRowCount: number
    trend: Array<{
      periodKey: string
      periodLabel: string
      expected: number
      received: number
    }>
  }
  financingAnalytics: {
    outstandingPrincipal: number
    overdueAmount: number
    dueThisMonthAmount: number
    pendingDisbursementCount: number
    pendingDisbursementAmount: number
    par30Amount: number
    par60Amount: number
    par90Amount: number
    openCollectionCases: number
    highPriorityCollectionCases: number
    nextActionDueCount: number
    movementTrend: Array<{
      periodKey: string
      periodLabel: string
      disbursedPrincipal: number
      repaymentsPosted: number
      overdueScheduledAmount: number
    }>
  }
  memberTrustAnalytics: {
    activeMemberCount: number
    pendingMemberApprovals: number
    kycPendingCount: number
    pendingDocumentReviewCount: number
    failedImportCount: number
  }
  shareProfitAnalytics: {
    shareCapitalBalance: number
    activeInvestmentPoolCount: number
    profitPendingAllocation: number
    draftDividendPeriodCount: number
  }
}

export type AnalyticsSummaryInput = {
  tenantId: string
  period?: AnalyticsPeriod
}

const periodMonthCount: Record<AnalyticsPeriod, number> = {
  current_month: 1,
  last_3_months: 3,
  last_6_months: 6,
  last_12_months: 12,
}

function addMonths(date: Date, amount: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1),
  )
}

function getMonthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function formatPeriodLabel(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date)
}

function formatPeriodRangeLabel(start: Date, endExclusive: Date) {
  const end = addMonths(endExclusive, -1)

  if (
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth()
  ) {
    return formatPeriodLabel(start)
  }

  return `${formatPeriodLabel(start)} - ${formatPeriodLabel(end)}`
}

function getPeriodMonths(period: AnalyticsPeriod) {
  const currentMonthStart = getMonthStart()
  const start = addMonths(currentMonthStart, -(periodMonthCount[period] - 1))
  const endExclusive = addMonths(currentMonthStart, 1)
  const months: Array<{
    date: Date
    key: string
    month: number
    year: number
    label: string
  }> = []

  for (
    let cursor = start;
    cursor < endExclusive;
    cursor = addMonths(cursor, 1)
  ) {
    const year = cursor.getUTCFullYear()
    const month = cursor.getUTCMonth() + 1

    months.push({
      date: cursor,
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: formatPeriodLabel(cursor),
      month,
      year,
    })
  }

  return {
    currentKey: months.at(-1)?.key ?? "",
    endExclusive,
    label: formatPeriodRangeLabel(start, endExclusive),
    months,
    start,
  }
}

function numberValue(value: unknown) {
  return Number(value ?? 0)
}

function remainingDue(input: { amountPaid: unknown; totalDue: unknown }) {
  return Math.max(0, numberValue(input.totalDue) - numberValue(input.amountPaid))
}

function getDaysOverdue(input: Date) {
  const diff = Date.now() - input.getTime()

  return Math.max(0, Math.floor(diff / 86_400_000))
}

function emptyAnalyticsSummary(input: {
  currencyCode?: string
  period: AnalyticsPeriod
  tenantId: string
  tenantName?: string
}): AnalyticsSummary {
  const periodRange = getPeriodMonths(input.period)

  return {
    workspace: {
      currencyCode: input.currencyCode ?? "NGN",
      generatedAt: new Date().toISOString(),
      periodLabel: periodRange.label,
      tenantId: input.tenantId,
      tenantName: input.tenantName ?? "Workspace",
    },
    primaryMetrics: {
      actionQueueTotal: 0,
      collectionCoverage: 0,
      deployableFunds: 0,
      pendingDisbursementAmount: 0,
      portfolioAtRiskRate: 0,
    },
    contributionAnalytics: {
      collectionGap: 0,
      expectedThisMonth: 0,
      paidMemberCount: 0,
      receivedThisMonth: 0,
      stagedMemberRowCount: 0,
      trend: periodRange.months.map((month) => ({
        expected: 0,
        periodKey: month.key,
        periodLabel: month.label,
        received: 0,
      })),
      unpaidMemberCount: 0,
    },
    financingAnalytics: {
      dueThisMonthAmount: 0,
      highPriorityCollectionCases: 0,
      movementTrend: periodRange.months.map((month) => ({
        disbursedPrincipal: 0,
        overdueScheduledAmount: 0,
        periodKey: month.key,
        periodLabel: month.label,
        repaymentsPosted: 0,
      })),
      nextActionDueCount: 0,
      openCollectionCases: 0,
      outstandingPrincipal: 0,
      overdueAmount: 0,
      par30Amount: 0,
      par60Amount: 0,
      par90Amount: 0,
      pendingDisbursementAmount: 0,
      pendingDisbursementCount: 0,
    },
    memberTrustAnalytics: {
      activeMemberCount: 0,
      failedImportCount: 0,
      kycPendingCount: 0,
      pendingDocumentReviewCount: 0,
      pendingMemberApprovals: 0,
    },
    shareProfitAnalytics: {
      activeInvestmentPoolCount: 0,
      draftDividendPeriodCount: 0,
      profitPendingAllocation: 0,
      shareCapitalBalance: 0,
    },
  }
}

export async function getAnalyticsSummary(
  input: AnalyticsSummaryInput,
  prismaOverride?: PrismaClient,
): Promise<AnalyticsSummary> {
  const period = input.period ?? "last_6_months"
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return emptyAnalyticsSummary({ period, tenantId: input.tenantId })
  }

  const periodRange = getPeriodMonths(period)
  const tenant = await prisma.tenant.findUnique({
    select: {
      currencyCode: true,
      id: true,
      name: true,
    },
    where: { id: input.tenantId },
  })

  if (!tenant) {
    return emptyAnalyticsSummary({ period, tenantId: input.tenantId })
  }

  const currentMonthStart = getMonthStart()
  const nextMonthStart = addMonths(currentMonthStart, 1)
  const monthFilters = periodRange.months.map((month) => ({
    periodMonth: month.month,
    periodYear: month.year,
  }))

  const [
    overview,
    monthlyRecords,
    postedContributions,
    disbursedLoans,
    postedRepayments,
    overdueScheduleItems,
    dueThisMonthScheduleItems,
    outstandingLoanSum,
    pendingDisbursements,
    activeMemberCount,
    pendingMemberApprovals,
    kycPendingCount,
    pendingDocumentReviewCount,
    failedImportCount,
    openCollectionCases,
    highPriorityCollectionCases,
    nextActionDueCount,
    activeInvestmentPoolCount,
    shareCapitalBalance,
    pendingProfitEntries,
    pendingShareAllocations,
    draftDividendPeriodCount,
  ] = await Promise.all([
    getOverviewSummary(input.tenantId, prisma),
    prisma.monthlyRecord.findMany({
      include: {
        memberRows: {
          select: {
            calculatedPayableAmount: true,
            status: true,
            totalPaidAmount: true,
          },
        },
      },
      orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
      where: {
        OR: monthFilters,
        tenantId: input.tenantId,
      },
    }),
    prisma.contribution.findMany({
      select: {
        amount: true,
        memberId: true,
        postedAt: true,
      },
      where: {
        postedAt: {
          gte: periodRange.start,
          lt: periodRange.endExclusive,
        },
        status: "posted",
        tenantId: input.tenantId,
      },
    }),
    prisma.loan.findMany({
      select: {
        disbursedAt: true,
        principalAmount: true,
      },
      where: {
        disbursedAt: {
          gte: periodRange.start,
          lt: periodRange.endExclusive,
        },
        tenantId: input.tenantId,
      },
    }),
    prisma.repayment.findMany({
      select: {
        amount: true,
        paidAt: true,
      },
      where: {
        paidAt: {
          gte: periodRange.start,
          lt: periodRange.endExclusive,
        },
        status: "posted",
        tenantId: input.tenantId,
      },
    }),
    prisma.repaymentScheduleItem.findMany({
      select: {
        amountPaid: true,
        dueAt: true,
        totalDue: true,
      },
      where: {
        dueAt: { lt: new Date() },
        loan: { status: { in: [...activeFinancingStatuses] } },
        status: { in: [...riskScheduleStatuses] },
        tenantId: input.tenantId,
      },
    }),
    prisma.repaymentScheduleItem.findMany({
      select: {
        amountPaid: true,
        totalDue: true,
      },
      where: {
        dueAt: {
          gte: currentMonthStart,
          lt: nextMonthStart,
        },
        loan: { status: { in: [...activeFinancingStatuses] } },
        status: { in: [...riskScheduleStatuses] },
        tenantId: input.tenantId,
      },
    }),
    prisma.loan.aggregate({
      _sum: { outstandingPrincipal: true },
      where: {
        status: { in: [...activeFinancingStatuses] },
        tenantId: input.tenantId,
      },
    }),
    prisma.loan.aggregate({
      _count: true,
      _sum: { principalAmount: true },
      where: {
        status: "approved",
        tenantId: input.tenantId,
      },
    }),
    prisma.member.count({
      where: { status: "active", tenantId: input.tenantId },
    }),
    prisma.memberOnboardingRequest.count({
      where: { status: "pending_approval", tenantId: input.tenantId },
    }),
    prisma.member.count({
      where: {
        kycStatus: { in: [...pendingKycStatuses] },
        status: "active",
        tenantId: input.tenantId,
      },
    }),
    prisma.memberDocument.count({
      where: { reviewStatus: "pending", tenantId: input.tenantId },
    }),
    prisma.importBatch.count({
      where: { status: "failed", tenantId: input.tenantId },
    }),
    prisma.collectionFollowUp.count({
      where: {
        resolutionStatus: "open",
        tenantId: input.tenantId,
      },
    }),
    prisma.collectionFollowUp.count({
      where: {
        priority: { in: ["high", "urgent"] },
        resolutionStatus: "open",
        tenantId: input.tenantId,
      },
    }),
    prisma.collectionFollowUp.count({
      where: {
        nextActionAt: { lte: new Date() },
        resolutionStatus: "open",
        tenantId: input.tenantId,
      },
    }),
    prisma.shareBusiness.count({
      where: { status: "active", tenantId: input.tenantId },
    }),
    prisma.memberShareLedgerEntry.aggregate({
      _sum: { amount: true },
      where: { tenantId: input.tenantId },
    }),
    prisma.shareBusinessProfitEntry.aggregate({
      _sum: { allocatableProfitAmount: true },
      where: {
        status: { in: ["draft", "reviewed"] },
        tenantId: input.tenantId,
      },
    }),
    prisma.shareProfitAllocation.aggregate({
      _sum: { allocatedProfitAmount: true },
      where: { status: "draft", tenantId: input.tenantId },
    }),
    prisma.dividendPeriod.count({
      where: { status: "draft", tenantId: input.tenantId },
    }),
  ])

  const monthlyRecordByKey = new Map(
    monthlyRecords.map((record) => [
      `${record.periodYear}-${String(record.periodMonth).padStart(2, "0")}`,
      record,
    ]),
  )
  const receivedContributionByKey = new Map<string, number>()
  const disbursedPrincipalByKey = new Map<string, number>()
  const repaymentsByKey = new Map<string, number>()
  const overdueScheduledByKey = new Map<string, number>()

  for (const contribution of postedContributions) {
    const key = `${contribution.postedAt.getUTCFullYear()}-${String(
      contribution.postedAt.getUTCMonth() + 1,
    ).padStart(2, "0")}`

    receivedContributionByKey.set(
      key,
      (receivedContributionByKey.get(key) ?? 0) + numberValue(contribution.amount),
    )
  }

  for (const loan of disbursedLoans) {
    if (!loan.disbursedAt) continue

    const key = `${loan.disbursedAt.getUTCFullYear()}-${String(
      loan.disbursedAt.getUTCMonth() + 1,
    ).padStart(2, "0")}`

    disbursedPrincipalByKey.set(
      key,
      (disbursedPrincipalByKey.get(key) ?? 0) + numberValue(loan.principalAmount),
    )
  }

  for (const repayment of postedRepayments) {
    const key = `${repayment.paidAt.getUTCFullYear()}-${String(
      repayment.paidAt.getUTCMonth() + 1,
    ).padStart(2, "0")}`

    repaymentsByKey.set(
      key,
      (repaymentsByKey.get(key) ?? 0) + numberValue(repayment.amount),
    )
  }

  for (const item of overdueScheduleItems) {
    const key = `${item.dueAt.getUTCFullYear()}-${String(
      item.dueAt.getUTCMonth() + 1,
    ).padStart(2, "0")}`

    overdueScheduledByKey.set(
      key,
      (overdueScheduledByKey.get(key) ?? 0) + remainingDue(item),
    )
  }

  const contributionTrend = periodRange.months.map((month) => {
    const record = monthlyRecordByKey.get(month.key)
    const expected =
      record?.memberRows.reduce(
        (total, row) => total + numberValue(row.calculatedPayableAmount),
        0,
      ) ??
      (month.key === periodRange.currentKey
        ? overview.contributionHealth.expectedThisMonth
        : 0)
    const received =
      record?.memberRows.reduce(
        (total, row) => total + numberValue(row.totalPaidAmount),
        0,
      ) ??
      (receivedContributionByKey.get(month.key) ??
        (month.key === periodRange.currentKey
          ? overview.contributionHealth.receivedThisMonth
          : 0))

    return {
      expected,
      periodKey: month.key,
      periodLabel: month.label,
      received,
    }
  })
  const currentRecord = monthlyRecordByKey.get(periodRange.currentKey)
  const overdueAmount = overdueScheduleItems.reduce(
    (total, item) => total + remainingDue(item),
    0,
  )
  const dueThisMonthAmount = dueThisMonthScheduleItems.reduce(
    (total, item) => total + remainingDue(item),
    0,
  )
  const par30Amount = overdueScheduleItems.reduce(
    (total, item) => total + (getDaysOverdue(item.dueAt) >= 30 ? remainingDue(item) : 0),
    0,
  )
  const par60Amount = overdueScheduleItems.reduce(
    (total, item) => total + (getDaysOverdue(item.dueAt) >= 60 ? remainingDue(item) : 0),
    0,
  )
  const par90Amount = overdueScheduleItems.reduce(
    (total, item) => total + (getDaysOverdue(item.dueAt) >= 90 ? remainingDue(item) : 0),
    0,
  )
  const outstandingPrincipal = numberValue(
    outstandingLoanSum._sum.outstandingPrincipal,
  )
  const pendingDisbursementAmount = numberValue(
    pendingDisbursements._sum.principalAmount,
  )
  const profitPendingAllocation =
    numberValue(pendingProfitEntries._sum.allocatableProfitAmount) +
    numberValue(pendingShareAllocations._sum.allocatedProfitAmount)

  return {
    workspace: {
      currencyCode: tenant.currencyCode,
      generatedAt: new Date().toISOString(),
      periodLabel: periodRange.label,
      tenantId: tenant.id,
      tenantName: tenant.name,
    },
    primaryMetrics: {
      actionQueueTotal: overview.primaryMetrics.actionQueueTotal,
      collectionCoverage: overview.primaryMetrics.collectionCoverage,
      deployableFunds: overview.primaryMetrics.deployableFunds,
      pendingDisbursementAmount,
      portfolioAtRiskRate:
        outstandingPrincipal > 0 ? overdueAmount / outstandingPrincipal : 0,
    },
    contributionAnalytics: {
      collectionGap: overview.contributionHealth.collectionGap,
      expectedThisMonth: overview.contributionHealth.expectedThisMonth,
      paidMemberCount: overview.contributionHealth.paidMemberCount,
      receivedThisMonth: overview.contributionHealth.receivedThisMonth,
      stagedMemberRowCount:
        currentRecord?.memberRows.filter((row) => row.status === "pending")
          .length ?? 0,
      trend: contributionTrend,
      unpaidMemberCount: overview.contributionHealth.unpaidMemberCount,
    },
    financingAnalytics: {
      dueThisMonthAmount,
      highPriorityCollectionCases,
      movementTrend: periodRange.months.map((month) => ({
        disbursedPrincipal: disbursedPrincipalByKey.get(month.key) ?? 0,
        overdueScheduledAmount: overdueScheduledByKey.get(month.key) ?? 0,
        periodKey: month.key,
        periodLabel: month.label,
        repaymentsPosted: repaymentsByKey.get(month.key) ?? 0,
      })),
      nextActionDueCount,
      openCollectionCases,
      outstandingPrincipal,
      overdueAmount,
      par30Amount,
      par60Amount,
      par90Amount,
      pendingDisbursementAmount,
      pendingDisbursementCount: pendingDisbursements._count,
    },
    memberTrustAnalytics: {
      activeMemberCount,
      failedImportCount,
      kycPendingCount,
      pendingDocumentReviewCount,
      pendingMemberApprovals,
    },
    shareProfitAnalytics: {
      activeInvestmentPoolCount,
      draftDividendPeriodCount,
      profitPendingAllocation,
      shareCapitalBalance: numberValue(shareCapitalBalance._sum.amount),
    },
  }
}
