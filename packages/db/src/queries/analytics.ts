import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { getDeployableFundsSnapshot } from "./financing-cycles"
import {
  getLateLoanPayments,
  getMemberAndShareCounts,
  getMonthlyTrend,
} from "./report-figures"

export type AnalyticsPeriod =
  | "current_month"
  | "last_3_months"
  | "last_6_months"
  | "last_12_months"

export type AnalyticsMonth = {
  /** "2026-11" */
  key: string
  /** "Nov 2026" */
  label: string
  /** "Nov" */
  shortLabel: string
  expected: number
  received: number
  loansPaidOut: number
  loanRepayments: number
}

export type AnalyticsSummary = {
  periodLabel: string
  keyNumbers: {
    /** Approved loans not yet paid out. */
    approvedNotPaidOut: number
    expectedThisMonth: number
    latePayments: number
    lateLoanCount: number
    moneyToLend: number
    owedOnLoans: number
    receivedThisMonth: number
  }
  months: AnalyticsMonth[]
  late: {
    amount: number
    loanCount: number
    under30Days: number
    from30To59Days: number
    from60To89Days: number
    over90Days: number
  }
  members: {
    active: number
    documentsToReview: number
    idChecksToReview: number
    waitingToJoin: number
  }
  shares: {
    activeBusinesses: number
    profitNotShared: number
    shareCapital: number
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
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1)
  )
}

function getMonthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

const monthYear = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  timeZone: "UTC",
  year: "numeric",
})
const shortMonthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

function getPeriodRange(period: AnalyticsPeriod, now = new Date()) {
  const currentMonthStart = getMonthStart(now)
  const start = addMonths(currentMonthStart, -(periodMonthCount[period] - 1))
  const endExclusive = addMonths(currentMonthStart, 1)
  const label =
    period === "current_month"
      ? monthYear.format(currentMonthStart)
      : `${monthYear.format(start)} to ${monthYear.format(currentMonthStart)}`
  const months: Array<{ key: string; label: string; shortLabel: string }> = []

  for (
    let cursor = start;
    cursor < endExclusive;
    cursor = addMonths(cursor, 1)
  ) {
    months.push({
      key: `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
      label: monthYear.format(cursor),
      shortLabel: shortMonthNames[cursor.getUTCMonth()] ?? "",
    })
  }

  return { currentMonthStart, endExclusive, label, months, start }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

export function getEmptyAnalyticsSummary(
  period: AnalyticsPeriod = "last_6_months"
): AnalyticsSummary {
  const range = getPeriodRange(period)

  return {
    keyNumbers: {
      approvedNotPaidOut: 0,
      expectedThisMonth: 0,
      lateLoanCount: 0,
      latePayments: 0,
      moneyToLend: 0,
      owedOnLoans: 0,
      receivedThisMonth: 0,
    },
    late: {
      amount: 0,
      from30To59Days: 0,
      from60To89Days: 0,
      loanCount: 0,
      over90Days: 0,
      under30Days: 0,
    },
    members: {
      active: 0,
      documentsToReview: 0,
      idChecksToReview: 0,
      waitingToJoin: 0,
    },
    months: range.months.map((month) => ({
      ...month,
      expected: 0,
      loanRepayments: 0,
      loansPaidOut: 0,
      received: 0,
    })),
    periodLabel: range.label,
    shares: { activeBusinesses: 0, profitNotShared: 0, shareCapital: 0 },
  }
}

/**
 * Staff analytics: four SQL aggregates plus the shared money-to-lend
 * snapshot. Every sum happens in the database.
 */
export async function getAnalyticsSummary(
  input: AnalyticsSummaryInput,
  prismaOverride?: PrismaClient
): Promise<AnalyticsSummary> {
  const period = input.period ?? "last_6_months"
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return getEmptyAnalyticsSummary(period)
  }

  const range = getPeriodRange(period)
  const [funds, trend, late, counts] = await Promise.all([
    getDeployableFundsSnapshot({ tenantId: input.tenantId }, prisma),
    getMonthlyTrend(prisma, {
      currentMonthStart: range.currentMonthStart,
      endExclusive: range.endExclusive,
      start: range.start,
      tenantId: input.tenantId,
    }),
    getLateLoanPayments(prisma, { tenantId: input.tenantId }),
    getMemberAndShareCounts(prisma, { tenantId: input.tenantId }),
  ])
  const trendByKey = new Map(trend.map((row) => [row.key, row]))
  const months = range.months.map((month) => {
    const row = trendByKey.get(month.key)
    return {
      ...month,
      expected: row?.expected ?? 0,
      loanRepayments: row?.loanRepayments ?? 0,
      loansPaidOut: row?.loansPaidOut ?? 0,
      received: row?.received ?? 0,
    }
  })
  const thisMonth = months.at(-1)

  return {
    keyNumbers: {
      approvedNotPaidOut: funds.approvedHoldAmount,
      expectedThisMonth: thisMonth?.expected ?? 0,
      lateLoanCount: late.loanCount,
      latePayments: late.amount,
      moneyToLend: funds.deployableFunds,
      owedOnLoans: funds.outstandingFinancingAmount,
      receivedThisMonth: thisMonth?.received ?? 0,
    },
    late: {
      amount: late.amount,
      from30To59Days: roundMoney(late.over30Days - late.over60Days),
      from60To89Days: roundMoney(late.over60Days - late.over90Days),
      loanCount: late.loanCount,
      over90Days: late.over90Days,
      under30Days: roundMoney(late.amount - late.over30Days),
    },
    members: {
      active: counts.activeMembers,
      documentsToReview: counts.documentsToReview,
      idChecksToReview: counts.idChecksToReview,
      waitingToJoin: counts.waitingToJoin,
    },
    months,
    periodLabel: range.label,
    shares: {
      activeBusinesses: counts.activeBusinesses,
      profitNotShared: counts.profitNotShared,
      shareCapital: counts.shareCapital,
    },
  }
}
