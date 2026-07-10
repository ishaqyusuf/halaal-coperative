import {
  buildBackfillDraft,
  type BackfillDraft,
  type BackfillProfitPeriod,
  type BuildBackfillDraftInput,
} from "@halaalvest/backfill"
import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { applyCharge, applyLoanRequestChargesInTransaction } from "./charges"
import { recordContribution } from "./contributions"
import { createAuditLogEntry } from "./audit"
import { getLedgerAccountByCode, postLedgerTransaction } from "./ledger"
import { getTenantInitialMigrationState } from "./migration"
import { readOptionalTenantBusinessPolicy } from "./tenant-business-policy"
import {
  createMemberShareLedgerEntry,
  getTenantSharePolicy,
  getResolvedShareAmountForMonth,
} from "./tenant-finance"

async function assertBackfillMutationOpen(
  tenantId: string,
  prisma: PrismaClient
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (
    !migrationState.snapshot.canUseMigrationTools &&
    !migrationState.snapshot.canUseLiveFinancialWrites
  ) {
    throw new Error(
      "Member ledger backfill is locked because migration tools and live financial writes are closed."
    )
  }
}

function startOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
}

function endOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0))
}

function eachMonthBetween(start: Date, end: Date) {
  const months: Date[] = []
  const cursor = startOfMonth(start)
  const limit = startOfMonth(end)

  while (cursor <= limit) {
    months.push(new Date(cursor))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return months
}

function monthKeyFromDate(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`
}

type BusinessProfitSeasonPolicy = {
  financialYearStartMonth: number
  profitDistributionFrequency: string
}

async function getBusinessProfitSeasonPolicy(
  tenantId: string,
  prisma: any
): Promise<BusinessProfitSeasonPolicy> {
  const policy = await readOptionalTenantBusinessPolicy(
    prisma,
    (tenantBusinessPolicy) =>
      tenantBusinessPolicy.findUnique({
        select: {
          financialYearStartMonth: true,
          profitDistributionFrequency: true,
        },
        where: { tenantId },
      }),
  )

  return {
    financialYearStartMonth: Number(policy?.financialYearStartMonth ?? 1),
    profitDistributionFrequency: policy?.profitDistributionFrequency ?? "annual",
  }
}

function addUtcMonths(value: Date, months: number) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1),
  )
}

function monthDifference(start: Date, end: Date) {
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth())
  )
}

function getProfitSharingPeriodEnd(
  profitDate: Date,
  policy: BusinessProfitSeasonPolicy,
) {
  const frequencyMonths =
    policy.profitDistributionFrequency === "quarterly"
      ? 3
      : policy.profitDistributionFrequency === "semi_annual"
        ? 6
        : policy.profitDistributionFrequency === "annual"
          ? 12
          : null

  if (!frequencyMonths) {
    return profitDate
  }

  const financialYearStartMonth = Math.min(
    Math.max(Math.trunc(policy.financialYearStartMonth), 1),
    12,
  )
  const financialYearStartMonthIndex = financialYearStartMonth - 1
  const profitMonth = startOfMonth(profitDate)
  let financialYearStart = new Date(
    Date.UTC(profitMonth.getUTCFullYear(), financialYearStartMonthIndex, 1),
  )

  if (profitMonth < financialYearStart) {
    financialYearStart = new Date(
      Date.UTC(profitMonth.getUTCFullYear() - 1, financialYearStartMonthIndex, 1),
    )
  }

  const elapsedMonths = Math.max(
    0,
    monthDifference(financialYearStart, profitMonth),
  )
  const periodIndex = Math.floor(elapsedMonths / frequencyMonths)
  const periodStart = addUtcMonths(
    financialYearStart,
    periodIndex * frequencyMonths,
  )
  const periodEndMonth = addUtcMonths(periodStart, frequencyMonths - 1)

  return endOfMonth(periodEndMonth)
}

function getProfitSharingMonthKey(
  profitDate: Date,
  policy: BusinessProfitSeasonPolicy,
) {
  return monthKeyFromDate(getProfitSharingPeriodEnd(profitDate, policy))
}

function isSkippedBackfillRow(rowStatus: string | null | undefined) {
  return rowStatus === "missed" || rowStatus === "paused"
}

function inclusiveMonthDifference(start: Date, end: Date) {
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth()) +
    1
  )
}

function monthDateFromKey(value: string) {
  const [yearText, monthText] = value.split("-")
  return new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1))
}

function parseBackfillMonthKey(value: string, label: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM format.`)
  }

  const [yearText, monthText] = value.split("-")
  const year = Number(yearText)
  const month = Number(monthText)

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(`${label} must be a valid month.`)
  }

  return new Date(Date.UTC(year, month - 1, 1))
}

function assertBackfillDraftRowsMatchRange(input: {
  draft: BackfillDraft
  endMonth: string
  startMonth: string
}) {
  const rangeStart = parseBackfillMonthKey(input.startMonth, "startMonth")
  const rangeEnd = parseBackfillMonthKey(input.endMonth, "endMonth")

  if (rangeStart > rangeEnd) {
    throw new Error(
      "Backfill draft startMonth must be before or equal to endMonth."
    )
  }

  const expectedMonthCount = inclusiveMonthDifference(rangeStart, rangeEnd)
  const seenMonths = new Set<string>()

  for (const row of input.draft.rows) {
    const rowMonth = parseBackfillMonthKey(row.month, "Backfill row month")

    if (rowMonth < rangeStart || rowMonth > rangeEnd) {
      throw new Error(
        `Backfill draft row ${row.month} falls outside the declared ${input.startMonth} to ${input.endMonth} range.`
      )
    }

    if (seenMonths.has(row.month)) {
      throw new Error(
        `Backfill draft contains duplicate row month ${row.month}.`
      )
    }

    seenMonths.add(row.month)
  }

  if (seenMonths.size !== expectedMonthCount) {
    throw new Error(
      "Backfill draft must contain exactly one row for every month in the declared range."
    )
  }

  return { rangeEnd, rangeStart }
}

async function assertMemberBackfillDraftNotAlreadyApplied(input: {
  tenantId: string
  memberId: string
  tx: any
}) {
  const appliedMonths =
    typeof input.tx.appliedBackfillMonth?.findMany === "function"
      ? await input.tx.appliedBackfillMonth.findMany({
          where: {
            tenantId: input.tenantId,
            memberId: input.memberId,
          },
          select: { id: true },
          take: 1,
        })
      : []
  const appliedBatches =
    typeof input.tx.backfillBatch?.findMany === "function"
      ? await input.tx.backfillBatch.findMany({
          where: {
            tenantId: input.tenantId,
            memberId: input.memberId,
            status: "applied",
          },
          select: { id: true },
          take: 1,
        })
      : []

  if (appliedMonths.length || appliedBatches.length) {
    throw new Error(
      "This member's historical ledger has already been applied. Use correction workflows instead of regenerating migration drafts."
    )
  }
}

async function resolveMemberAmountForMonth(
  input: {
    tenantId: string
    memberId: string
    month: Date
  },
  prisma: PrismaClient
) {
  const amountLog = await prisma.memberAmountLog.findFirst({
    where: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      effectiveFrom: {
        lte: input.month,
      },
    },
    orderBy: { effectiveFrom: "desc" },
  })

  return amountLog ? Number(amountLog.amount) : 0
}

async function resolveChargeTotalForMonth(
  input: {
    tenantId: string
    month: Date
  },
  prisma: PrismaClient
) {
  const definitions = await prisma.chargeDefinition.findMany({
    where: {
      tenantId: input.tenantId,
      isActive: true,
      appliesToMembers: true,
    },
    include: {
      versions: {
        where: {
          effectiveFrom: {
            lte: input.month,
          },
        },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
  })

  return definitions.reduce((sum, definition) => {
    const version = definition.versions[0]
    if (!version) return sum
    return sum + Number(version.amount)
  }, 0)
}

async function resolveLoanSnapshotForMonth(
  input: {
    tenantId: string
    memberId: string
    month: Date
  },
  prisma: PrismaClient
) {
  const loans = await prisma.loan.findMany({
    where: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      status: {
        in: ["approved", "disbursed", "active", "completed"],
      },
      OR: [
        { disbursedAt: null },
        { disbursedAt: { lte: endOfMonth(input.month) } },
      ],
    },
    include: {
      repaymentScheduleItems: {
        where: {
          dueAt: {
            gte: startOfMonth(input.month),
            lte: endOfMonth(input.month),
          },
        },
      },
    },
    orderBy: { disbursedAt: "desc" },
  })

  const loanServiceAmount = loans.reduce(
    (sum, loan) =>
      sum +
      loan.repaymentScheduleItems.reduce(
        (rowSum, item) => rowSum + Number(item.totalDue),
        0
      ),
    0
  )
  const pendingLoanPayment = loans.reduce(
    (sum, loan) =>
      sum +
      loan.repaymentScheduleItems.reduce(
        (rowSum, item) =>
          rowSum + Math.max(0, Number(item.totalDue) - Number(item.amountPaid)),
        0
      ),
    0
  )
  const monthlyTopup = loans.reduce(
    (sum, loan) => sum + Number(loan.extraMonthlySavingsAmount),
    0
  )

  return {
    loanCollected: loanServiceAmount,
    loanServiceAmount,
    monthlyTopup,
    pendingLoanPayment,
  }
}

async function collectExistingHistoryImpacts(
  input: {
    tenantId: string
    memberId: string
    startMonth: Date
    endMonth: Date
  },
  prisma: any
) {
  const [contributions, chargeApplications, repayments, dividendAllocations] =
    await Promise.all([
      prisma.contribution.findMany({
        where: {
          tenantId: input.tenantId,
          memberId: input.memberId,
          postedAt: {
            gte: input.startMonth,
            lte: endOfMonth(input.endMonth),
          },
        },
        select: {
          id: true,
          postedAt: true,
          amount: true,
        },
      }),
      prisma.chargeApplication.findMany({
        where: {
          tenantId: input.tenantId,
          memberId: input.memberId,
          assessedAt: {
            gte: input.startMonth,
            lte: endOfMonth(input.endMonth),
          },
        },
        select: {
          id: true,
          assessedAt: true,
          amount: true,
          chargeDefinition: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.repayment.findMany({
        where: {
          tenantId: input.tenantId,
          memberId: input.memberId,
          paidAt: {
            gte: input.startMonth,
            lte: endOfMonth(input.endMonth),
          },
        },
        select: {
          id: true,
          paidAt: true,
          amount: true,
        },
      }),
      prisma.dividendAllocation.findMany({
        where: {
          tenantId: input.tenantId,
          memberId: input.memberId,
          dividendPeriod: {
            periodEnd: {
              gte: input.startMonth,
              lte: endOfMonth(input.endMonth),
            },
          },
        },
        select: {
          id: true,
          allocationAmount: true,
          dividendPeriod: {
            select: {
              name: true,
              periodEnd: true,
            },
          },
        },
      }),
    ])

  return [
    ...contributions.map((item: any) => ({
      kind: "contribution" as const,
      message: `Contribution history of ${Number(item.amount)} exists for ${monthKeyFromDate(item.postedAt)} and will be rebuilt.`,
      month: monthKeyFromDate(item.postedAt),
      severity: "medium" as const,
    })),
    ...chargeApplications.map((item: any) => ({
      kind: "charge" as const,
      message: `${item.chargeDefinition.name} charge history exists for ${monthKeyFromDate(item.assessedAt)} and will be rebuilt.`,
      month: monthKeyFromDate(item.assessedAt),
      severity: "medium" as const,
    })),
    ...repayments.map((item: any) => ({
      kind: "repayment" as const,
      message: `Repayment history of ${Number(item.amount)} exists for ${monthKeyFromDate(item.paidAt)} and will be rebuilt.`,
      month: monthKeyFromDate(item.paidAt),
      severity: "high" as const,
    })),
    ...dividendAllocations.map((item: any) => ({
      kind: "dividend" as const,
      message: `Dividend allocation from ${item.dividendPeriod.name} remains read-only and is shown for context.`,
      month: monthKeyFromDate(item.dividendPeriod.periodEnd),
      severity: "low" as const,
    })),
  ]
}

async function buildDividendEntries(
  input: {
    tenantId: string
    memberId: string
    startMonth: Date
    endMonth: Date
  },
  prisma: any
) {
  const businessPolicy = await getBusinessProfitSeasonPolicy(
    input.tenantId,
    prisma,
  )
  const allocations = await prisma.dividendAllocation.findMany({
    where: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      dividendPeriod: {
        periodEnd: {
          gte: input.startMonth,
          lte: endOfMonth(input.endMonth),
        },
      },
    },
    select: {
      allocationAmount: true,
      dividendPeriod: {
        select: {
          name: true,
          periodEnd: true,
        },
      },
    },
  })
  const migrationProfitAdjustments =
    typeof prisma.migrationProfitAdjustment?.findMany === "function"
      ? await prisma.migrationProfitAdjustment.findMany({
          include: {
            profitEntry: {
              include: {
                shareBusiness: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          where: {
            tenantId: input.tenantId,
            memberId: input.memberId,
            profitEntry: {
              profitDate: {
                gte: input.startMonth,
                lte: endOfMonth(input.endMonth),
              },
            },
          },
        })
      : []
  const shareProfitAllocations =
    typeof prisma.shareProfitAllocation?.findMany === "function"
      ? await prisma.shareProfitAllocation.findMany({
          include: {
            profitEntry: {
              include: {
                shareBusiness: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          where: {
            tenantId: input.tenantId,
            memberId: input.memberId,
            profitEntry: {
              profitDate: {
                gte: input.startMonth,
                lte: endOfMonth(input.endMonth),
              },
            },
          },
        })
      : []
  const publishedDividendPeriodMonths = new Set(
    allocations.map((allocation: any) =>
      monthKeyFromDate(allocation.dividendPeriod.periodEnd)
    )
  )

  return [
    ...allocations.map((allocation: any) => ({
      amount: Number(allocation.allocationAmount),
      label: allocation.dividendPeriod.name,
      month: monthKeyFromDate(allocation.dividendPeriod.periodEnd),
    })),
    ...shareProfitAllocations
      .filter((allocation: any) => {
        const profitMonth = getProfitSharingMonthKey(
          allocation.profitEntry.profitDate,
          businessPolicy,
        )

        return !publishedDividendPeriodMonths.has(profitMonth)
      })
      .map((allocation: any) => ({
        amount: Number(allocation.allocatedProfitAmount),
        label: `${allocation.profitEntry.shareBusiness.name} profit`,
        month: getProfitSharingMonthKey(
          allocation.profitEntry.profitDate,
          businessPolicy,
        ),
        profitEntryId: allocation.profitEntryId,
        sharePercentage: Number(allocation.sharePercentage),
      })),
    ...migrationProfitAdjustments.map((adjustment: any) => {
      const profitAmount = Number(
        adjustment.profitEntry.allocatableProfitAmount ??
          adjustment.profitEntry.profitAmount
      )
      const adjustedAmount =
        adjustment.allocatedProfitAmount == null
          ? profitAmount * (Number(adjustment.sharePercentage ?? 0) / 100)
          : Number(adjustment.allocatedProfitAmount)

      return {
        amount: adjustedAmount,
        label: `${adjustment.profitEntry.shareBusiness.name} profit`,
        month: getProfitSharingMonthKey(
          adjustment.profitEntry.profitDate,
          businessPolicy,
        ),
        profitEntryId: adjustment.profitEntryId,
        sharePercentage:
          adjustment.sharePercentage == null
            ? undefined
            : Number(adjustment.sharePercentage),
      }
    }),
  ]
}

async function buildProfitPeriods(
  input: {
    tenantId: string
    startMonth: Date
    endMonth: Date
  },
  prisma: any
) {
  const businessPolicy = await getBusinessProfitSeasonPolicy(
    input.tenantId,
    prisma,
  )

  if (typeof prisma.shareBusinessProfitEntry?.findMany === "function") {
    const entries = await prisma.shareBusinessProfitEntry.findMany({
      include: {
        shareBusiness: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ profitDate: "asc" }, { createdAt: "asc" }],
      where: {
        tenantId: input.tenantId,
        profitDate: {
          gte: input.startMonth,
          lte: endOfMonth(input.endMonth),
        },
      },
    })

    if (entries.length > 0) {
      return entries.map(
        (entry: any): BackfillProfitPeriod => ({
          distributableAmount: Number(
            entry.allocatableProfitAmount ?? entry.profitAmount
          ),
          month: getProfitSharingMonthKey(entry.profitDate, businessPolicy),
          notes: entry.reason ?? entry.shareBusiness?.name ?? "Business profit",
          totalProfitAmount: Number(entry.profitAmount),
        })
      )
    }
  }

  const businesses = await prisma.shareBusiness.findMany({
    where: {
      tenantId: input.tenantId,
      startDate: {
        lte: endOfMonth(input.endMonth),
      },
      OR: [{ endDate: null }, { endDate: { gte: input.startMonth } }],
    },
    orderBy: [{ startDate: "asc" }],
  })

  return businesses.map(
    (business: any): BackfillProfitPeriod => ({
      distributableAmount: Number(business.profitAmount),
      month: getProfitSharingMonthKey(
        business.endDate ?? business.startDate,
        businessPolicy,
      ),
      notes: business.name,
      totalProfitAmount: Number(business.profitAmount),
    })
  )
}

async function deleteMemberLedgerTransactionsForRange(input: {
  tenantId: string
  memberId: string
  startDate: Date
  endDate: Date
  tx: any
}) {
  const transactions = await input.tx.ledgerTransaction.findMany({
    where: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      postedAt: {
        gte: input.startDate,
        lte: input.endDate,
      },
    },
    select: {
      id: true,
    },
  })

  if (!transactions.length) return

  await input.tx.ledgerEntry.deleteMany({
    where: {
      tenantId: input.tenantId,
      ledgerTransactionId: {
        in: transactions.map((transaction: any) => transaction.id),
      },
    },
  })

  await input.tx.ledgerTransaction.deleteMany({
    where: {
      tenantId: input.tenantId,
      id: {
        in: transactions.map((transaction: any) => transaction.id),
      },
    },
  })
}

async function assertNoExistingMemberFinancialRecordsForRange(input: {
  tenantId: string
  memberId: string
  startDate: Date
  endDate: Date
  tx: any
}) {
  const ledgerTransactions =
    typeof input.tx.ledgerTransaction?.findMany === "function"
      ? await input.tx.ledgerTransaction.findMany({
          where: {
            tenantId: input.tenantId,
            memberId: input.memberId,
            postedAt: {
              gte: input.startDate,
              lte: input.endDate,
            },
          },
          select: { id: true },
          take: 1,
        })
      : []
  const chargeApplications =
    typeof input.tx.chargeApplication?.findMany === "function"
      ? await input.tx.chargeApplication.findMany({
          where: {
            tenantId: input.tenantId,
            memberId: input.memberId,
            assessedAt: {
              gte: input.startDate,
              lte: input.endDate,
            },
          },
          select: { id: true },
          take: 1,
        })
      : []
  const contributions =
    typeof input.tx.contribution?.findMany === "function"
      ? await input.tx.contribution.findMany({
          where: {
            tenantId: input.tenantId,
            memberId: input.memberId,
            postedAt: {
              gte: input.startDate,
              lte: input.endDate,
            },
          },
          select: { id: true },
          take: 1,
        })
      : []
  const repayments =
    typeof input.tx.repayment?.findMany === "function"
      ? await input.tx.repayment.findMany({
          where: {
            tenantId: input.tenantId,
            memberId: input.memberId,
            paidAt: {
              gte: input.startDate,
              lte: input.endDate,
            },
          },
          select: { id: true },
          take: 1,
        })
      : []

  if (
    ledgerTransactions.length ||
    chargeApplications.length ||
    contributions.length ||
    repayments.length
  ) {
    throw new Error(
      "Existing live financial records were found in this member backfill range. Use correction or reversal workflows instead of applying migration history over posted records."
    )
  }
}

async function resetLoanDerivedStateForMember(input: {
  tenantId: string
  memberId: string
  tx: any
}) {
  const loans = await input.tx.loan.findMany({
    where: {
      tenantId: input.tenantId,
      memberId: input.memberId,
    },
    include: {
      repaymentScheduleItems: true,
    },
  })

  for (const loan of loans) {
    await input.tx.repaymentScheduleItem.updateMany({
      where: {
        tenantId: input.tenantId,
        loanId: loan.id,
      },
      data: {
        amountPaid: 0,
        status: "pending",
      },
    })

    await input.tx.loan.update({
      where: {
        id: loan.id,
      },
      data: {
        outstandingPrincipal: loan.principalAmount,
        status: loan.disbursedAt ? "active" : "approved",
        closedAt: null,
      },
    })
  }
}

function buildPrincipalOnlySchedule(input: {
  principalAmount: number
  monthlyPrincipal: number
  startDate: Date
  tenantId: string
}) {
  const rows = []
  let remaining = input.principalAmount
  let installmentNumber = 1
  const dueAt = startOfMonth(input.startDate)

  while (remaining > 0) {
    const principalDue = Math.min(input.monthlyPrincipal, remaining)

    rows.push({
      amountPaid: 0,
      chargeDue: 0,
      dueAt: new Date(dueAt),
      installmentNumber,
      principalDue,
      status: "pending",
      tenantId: input.tenantId,
      totalDue: principalDue,
    })

    remaining = Number((remaining - principalDue).toFixed(2))
    installmentNumber += 1
    dueAt.setUTCMonth(dueAt.getUTCMonth() + 1)
  }

  return rows
}

function legacyLoanEventKey(event: Record<string, any>) {
  return [
    event.id ?? "",
    event.label ?? "Legacy migration loan",
    event.startMonth,
  ].join(":")
}

async function createLegacyBackfillLoanFromEvent(input: {
  actorUserId: string
  event: Record<string, any>
  memberId: string
  tenantId: string
  tx: any
}) {
  const principalAmount = Number(input.event.loanAmount)
  const outstandingPrincipal = Number(
    input.event.openingOutstandingPrincipalBalance ?? input.event.loanAmount
  )
  const monthlyPrincipal = Number(input.event.monthlyLoanServiceAmount)
  const startDate = monthDateFromKey(input.event.startMonth)
  const termMonths = Math.max(1, Number(input.event.durationMonths ?? 1))
  const loanLabel = input.event.label || "Legacy migration loan"

  const loanProduct = await input.tx.loanProduct.upsert({
    create: {
      isActive: true,
      loanType: "normal",
      maxSavingsMultiple: 2,
      name: "Legacy migration loan",
      tenantId: input.tenantId,
      termMonths,
    },
    update: {
      isActive: true,
      loanType: "normal",
      maxSavingsMultiple: 2,
      termMonths,
    },
    where: {
      tenantId_name: {
        name: "Legacy migration loan",
        tenantId: input.tenantId,
      },
    },
  })

  const request = await input.tx.loanRequest.create({
    data: {
      availablePoolSnapshot: 0,
      createdByUserId: input.actorUserId,
      eligibleAmountSnapshot: 0,
      estimatedMonthlyServicing: monthlyPrincipal,
      extraMonthlySavingsAmount: Number(input.event.topUp ?? 0),
      loanProductId: loanProduct.id,
      memberId: input.memberId,
      purpose: loanLabel,
      requestedAmount: principalAmount,
      requestedAt: startDate,
      requestedTermMonths: termMonths,
      reviewNotes:
        "Created from legacy loan migration draft during member ledger backfill.",
      status: "approved",
      tenantId: input.tenantId,
    },
  })

  await input.tx.loanApproval.create({
    data: {
      action: "approved",
      actedAt: startDate,
      actorUserId: input.actorUserId,
      loanRequestId: request.id,
      notes: "Approved during historical member ledger migration.",
      tenantId: input.tenantId,
    },
  })

  await applyLoanRequestChargesInTransaction(
    {
      actorUserId: input.actorUserId,
      assessedAt: startDate,
      loanRequestId: request.id,
      memberId: input.memberId,
      requestedAmount: principalAmount,
      sourceType: "backfill",
      tenantId: input.tenantId,
    },
    input.tx as PrismaClient,
  )

  const loan = await input.tx.loan.create({
    data: {
      disbursedAt: startDate,
      estimatedMonthlyServicing: monthlyPrincipal,
      extraMonthlySavingsAmount: Number(input.event.topUp ?? 0),
      firstRepaymentDueAt: startDate,
      loanProductId: loanProduct.id,
      loanRequestId: request.id,
      memberId: input.memberId,
      outstandingPrincipal,
      principalAmount,
      status: outstandingPrincipal > 0 ? "active" : "completed",
      tenantId: input.tenantId,
      termMonths,
    },
  })

  await input.tx.repaymentScheduleItem.createMany({
    data: buildPrincipalOnlySchedule({
      monthlyPrincipal,
      principalAmount: outstandingPrincipal,
      startDate,
      tenantId: input.tenantId,
    }).map((item) => ({
      ...item,
      loanId: loan.id,
    })),
  })

  await input.tx.auditLog.create({
    data: {
      action: "loan.legacy_backfill_created",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: loan.id,
      entityType: "Loan",
      metadata: {
        legacyLoanEventId: input.event.id ?? null,
        loanLabel,
        monthlyPrincipal,
        openingOutstandingPrincipalBalance: outstandingPrincipal,
      },
      occurredAt: new Date(),
      tenantId: input.tenantId,
    },
  })

  return loan
}

async function allocateRepaymentAcrossScheduleItems(input: {
  tenantId: string
  loanId: string
  amount: number
  tx: any
}) {
  let remaining = input.amount
  const scheduleItems = await input.tx.repaymentScheduleItem.findMany({
    where: {
      tenantId: input.tenantId,
      loanId: input.loanId,
      status: {
        in: ["pending", "due", "overdue", "partially_paid"],
      },
    },
    orderBy: [{ installmentNumber: "asc" }],
  })

  for (const item of scheduleItems) {
    if (remaining <= 0) break

    const outstandingForItem = Number(item.totalDue) - Number(item.amountPaid)
    if (outstandingForItem <= 0) continue

    const allocated = Math.min(outstandingForItem, remaining)
    const nextPaid = Number(item.amountPaid) + allocated

    await input.tx.repaymentScheduleItem.update({
      where: { id: item.id },
      data: {
        amountPaid: nextPaid,
        status: nextPaid >= Number(item.totalDue) ? "paid" : "partially_paid",
      },
    })

    remaining -= allocated
  }
}

async function postBackfillRepayment(input: {
  tenantId: string
  actorUserId: string
  memberId: string
  loanId: string
  amount: number
  paidAt: Date
  reference?: string
  tx: any
}) {
  const cashAccount = await getLedgerAccountByCode(
    input.tenantId,
    "2000",
    input.tx
  )
  const loanReceivableAccount = await getLedgerAccountByCode(
    input.tenantId,
    "1100",
    input.tx
  )

  if (!cashAccount || !loanReceivableAccount) {
    throw new Error("Ledger accounts not initialized for this cooperative")
  }

  const loan = await input.tx.loan.findFirst({
    where: { id: input.loanId, tenantId: input.tenantId },
  })

  if (!loan) throw new Error("Loan not found for backfill repayment.")
  if (input.amount > Number(loan.outstandingPrincipal)) {
    throw new Error(
      "Backfill repayment amount exceeds the outstanding loan balance."
    )
  }

  const repayment = await input.tx.repayment.create({
    data: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      loanId: input.loanId,
      receivedByUserId: input.actorUserId,
      paidAt: input.paidAt,
      amount: input.amount,
      status: "posted",
      reference: input.reference,
    },
  })

  await input.tx.loan.update({
    where: { id: loan.id },
    data: {
      outstandingPrincipal: {
        decrement: input.amount,
      },
      status:
        Number(loan.outstandingPrincipal) - input.amount <= 0
          ? "completed"
          : "active",
      ...(Number(loan.outstandingPrincipal) - input.amount <= 0
        ? { closedAt: input.paidAt }
        : {}),
    },
  })

  await allocateRepaymentAcrossScheduleItems({
    tenantId: input.tenantId,
    loanId: loan.id,
    amount: input.amount,
    tx: input.tx,
  })

  await postLedgerTransaction(
    {
      tenantId: input.tenantId,
      transactionType: "loan_repayment",
      postedAt: input.paidAt,
      memberId: input.memberId,
      loanId: loan.id,
      repaymentId: repayment.id,
      reference: input.reference,
      narration: "Backfill loan repayment",
      sourceType: "backfill",
      entries: [
        {
          ledgerAccountId: cashAccount.id,
          direction: "debit",
          amount: input.amount,
        },
        {
          ledgerAccountId: loanReceivableAccount.id,
          direction: "credit",
          amount: input.amount,
        },
      ],
    },
    input.tx
  )

  await input.tx.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorType: "user",
      action: "repayment.backfill_posted",
      entityType: "Repayment",
      entityId: repayment.id,
      metadata: {
        amount: input.amount,
        loanId: loan.id,
      },
      occurredAt: new Date(),
    },
  })

  return repayment
}

async function recalculateMemberSavingsSnapshot(input: {
  tenantId: string
  memberId: string
  tx: any
}) {
  const [contributions, charges, dividends] = await Promise.all([
    input.tx.contribution.findMany({
      where: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        status: "posted",
      },
      select: {
        amount: true,
        extraSavingsAmount: true,
      },
    }),
    input.tx.chargeApplication.findMany({
      where: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        status: "posted",
      },
      select: {
        amount: true,
      },
    }),
    input.tx.dividendAllocation.findMany({
      where: {
        tenantId: input.tenantId,
        memberId: input.memberId,
      },
      select: {
        allocationAmount: true,
      },
    }),
  ])

  const totalContributions = contributions.reduce(
    (sum: number, item: any) =>
      sum + Number(item.amount) + Number(item.extraSavingsAmount),
    0
  )
  const totalCharges = charges.reduce(
    (sum: number, item: any) => sum + Number(item.amount),
    0
  )
  const totalDividends = dividends.reduce(
    (sum: number, item: any) => sum + Number(item.allocationAmount),
    0
  )

  return input.tx.member.update({
    where: {
      id: input.memberId,
      tenantId: input.tenantId,
    },
    data: {
      totalSavingsSnapshot: totalContributions - totalCharges + totalDividends,
    },
  })
}

export async function listBackfillBatches(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  return prisma.backfillBatch.findMany({
    where: { tenantId },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          memberNumber: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export type MemberAmountLogRow = {
  amount: number
  effectiveFrom: Date
  id: string
  notes: string | null
}

export async function listMemberAmountLogs(
  input: {
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<MemberAmountLogRow[]> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (typeof prisma.memberAmountLog?.findMany !== "function") {
    return []
  }

  const rows = await prisma.memberAmountLog.findMany({
    orderBy: [{ effectiveFrom: "asc" }, { createdAt: "asc" }],
    where: {
      memberId: input.memberId,
      tenantId: input.tenantId,
    },
  })

  return rows.map((row: any) => ({
    amount: Number(row.amount),
    effectiveFrom: row.effectiveFrom,
    id: row.id,
    notes: row.notes,
  }))
}

export async function upsertMemberAmountLog(
  input: {
    actorUserId: string
    amount: number
    effectiveFrom: Date
    memberId: string
    notes?: string | null
    rowId?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (
    typeof prisma.memberAmountLog?.findFirst !== "function" ||
    typeof prisma.memberAmountLog?.create !== "function" ||
    typeof prisma.memberAmountLog?.update !== "function"
  ) {
    throw new Error(
      "Member commitment history requires the latest Prisma migration and generated client."
    )
  }

  if (input.amount < 0) {
    throw new Error("Commitment amount cannot be negative.")
  }

  await assertBackfillMutationOpen(input.tenantId, prisma)
  await assertMemberBackfillDraftNotAlreadyApplied({
    memberId: input.memberId,
    tenantId: input.tenantId,
    tx: prisma,
  })

  const existing = input.rowId
    ? await prisma.memberAmountLog.findFirst({
        where: {
          id: input.rowId,
          memberId: input.memberId,
          tenantId: input.tenantId,
        },
      })
    : await prisma.memberAmountLog.findFirst({
        where: {
          effectiveFrom: input.effectiveFrom,
          memberId: input.memberId,
          tenantId: input.tenantId,
        },
      })

  if (input.rowId && !existing) {
    throw new Error("Member commitment history row not found.")
  }

  const data = {
    amount: input.amount,
    effectiveFrom: input.effectiveFrom,
    notes: input.notes?.trim() || null,
  }
  const row = existing
    ? await prisma.memberAmountLog.update({
        data,
        where: { id: existing.id },
      })
    : await prisma.memberAmountLog.create({
        data: {
          ...data,
          createdByUserId: input.actorUserId,
          effectiveFrom: input.effectiveFrom,
          memberId: input.memberId,
          tenantId: input.tenantId,
        },
      })

  await createAuditLogEntry(
    {
      action: existing
        ? "migration.member_commitment.updated"
        : "migration.member_commitment.created",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: row.id,
      entityType: "MemberAmountLog",
      metadata: {
        amount: input.amount,
        effectiveFrom: input.effectiveFrom.toISOString(),
        memberId: input.memberId,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return row
}

export async function buildBackfillDraftInputForMember(
  input: {
    tenantId: string
    memberId: string
    startMonth?: Date
    endMonth?: Date
  },
  prismaOverride?: PrismaClient
): Promise<BuildBackfillDraftInput> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const member = await prisma.member.findFirst({
    where: {
      id: input.memberId,
      tenantId: input.tenantId,
    },
    select: {
      id: true,
      joinedAt: true,
      tenant: {
        select: {
          startDate: true,
        },
      },
    },
  })

  if (!member) {
    throw new Error("Member not found")
  }

  const amountLogs = await prisma.memberAmountLog.findMany({
    where: { tenantId: input.tenantId, memberId: input.memberId },
    orderBy: { effectiveFrom: "asc" },
  })
  const firstSavingHistoryMonth = amountLogs[0]?.effectiveFrom
  const startMonth = startOfMonth(
    input.startMonth ??
      firstSavingHistoryMonth ??
      member.tenant.startDate ??
      member.joinedAt
  )
  const endMonth = startOfMonth(input.endMonth ?? new Date())
  const sharePolicy = await getTenantSharePolicy(input.tenantId, prisma)
  const usesMonthlyShareHistory =
    sharePolicy.configurationMode === "monthly_history"

  const [
    shareOverrides,
    defaultShareVersions,
    chargeDefinitions,
    dividendEntries,
    existingHistoryImpacts,
    profitPeriods,
    legacyLoanDrafts,
    rowAdjustments,
    memberActivityEvents,
  ] = await Promise.all([
    usesMonthlyShareHistory
      ? prisma.memberShareOverride.findMany({
          where: { tenantId: input.tenantId, memberId: input.memberId },
          orderBy: { effectiveFrom: "asc" },
        })
      : [],
    usesMonthlyShareHistory
      ? prisma.tenantShareStructureVersion.findMany({
          where: { tenantId: input.tenantId },
          orderBy: { effectiveFrom: "asc" },
        })
      : [],
    prisma.chargeDefinition.findMany({
      where: {
        tenantId: input.tenantId,
        isActive: true,
        appliesToMembers: true,
      },
      include: {
        versions: {
          orderBy: { effectiveFrom: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    buildDividendEntries(
      {
        tenantId: input.tenantId,
        memberId: input.memberId,
        startMonth,
        endMonth,
      },
      prisma as PrismaClient
    ),
    collectExistingHistoryImpacts(
      {
        tenantId: input.tenantId,
        memberId: input.memberId,
        startMonth,
        endMonth,
      },
      prisma as PrismaClient
    ),
    buildProfitPeriods(
      {
        tenantId: input.tenantId,
        startMonth,
        endMonth,
      },
      prisma as PrismaClient
    ),
    typeof prisma.legacyLoanMigrationDraft?.findMany === "function"
      ? prisma.legacyLoanMigrationDraft.findMany({
          where: { tenantId: input.tenantId, memberId: input.memberId },
          orderBy: { openedAt: "asc" },
        })
      : [],
    typeof prisma.migrationBackfillAdjustment?.findMany === "function"
      ? prisma.migrationBackfillAdjustment.findMany({
          where: { tenantId: input.tenantId, memberId: input.memberId },
          orderBy: { month: "asc" },
        })
      : [],
    typeof prisma.memberActivityEvent?.findMany === "function"
      ? prisma.memberActivityEvent.findMany({
          where: { tenantId: input.tenantId, memberId: input.memberId },
          orderBy: { effectiveMonth: "asc" },
        })
      : [],
  ])

  return {
    activityEvents: memberActivityEvents.map((event: any) => ({
      effectiveFrom: monthKeyFromDate(event.effectiveMonth),
      notes: event.notes ?? undefined,
      reason: event.reason ?? undefined,
      status: event.status === "inactive" ? "inactive" : "active",
    })),
    amountLogs: amountLogs.map((item: any) => ({
      amount: Number(item.amount),
      effectiveFrom: monthKeyFromDate(item.effectiveFrom),
      notes: item.notes ?? undefined,
    })),
    chargeDefinitions: chargeDefinitions.map((definition: any) => ({
      code: definition.code,
      frequency: definition.chargeFrequency ?? "recurring_monthly",
      label: definition.name,
      versions: definition.versions.map((version: any) => ({
        amount: Number(version.amount),
        effectiveFrom: monthKeyFromDate(version.effectiveFrom),
        valueType:
          version.chargeValueType ??
          (version.kind === "percentage" ? "percentage" : "fixed_amount"),
      })),
    })),
    defaultShareVersions: defaultShareVersions.map((item: any) => ({
      amount: Number(item.amount),
      basis: item.basis ?? "after_charge_deductions",
      effectiveFrom: monthKeyFromDate(item.effectiveFrom),
      notes: item.notes ?? undefined,
      valueType: item.valueType ?? "fixed_amount",
    })),
    dividendEntries,
    endMonth: monthKeyFromDate(endMonth),
    existingHistoryImpacts,
    loanEvents: legacyLoanDrafts.map((draft: any) => {
      const openedAt = startOfMonth(draft.openedAt)
      const closedAt = draft.closedAt ? startOfMonth(draft.closedAt) : null
      const monthlyRepayment = Number(draft.scheduledMonthlyPrincipalRepayment)
      const outstandingPrincipalBalance = Number(
        draft.outstandingPrincipalBalance
      )
      const inferredDuration = Math.max(
        1,
        Math.ceil(outstandingPrincipalBalance / monthlyRepayment)
      )

      return {
        durationMonths: closedAt
          ? Math.max(1, inclusiveMonthDifference(openedAt, closedAt))
          : inferredDuration,
        id: draft.id,
        label: draft.loanLabel,
        loanAmount: Number(draft.principalAmount),
        loanPeriodSavingsContribution: Number(draft.savingsDuringLoan),
        monthlyLoanServiceAmount: monthlyRepayment,
        openingOutstandingPrincipalBalance: outstandingPrincipalBalance,
        startMonth: monthKeyFromDate(openedAt),
        topUp: Number(draft.savingsDuringLoan),
      }
    }),
    memberJoinedMonth: monthKeyFromDate(startOfMonth(member.joinedAt)),
    profitPeriods,
    rowAdjustments: rowAdjustments.map((adjustment: any) => ({
      loanRepaymentOnTime:
        adjustment.loanRepaymentOnTime == null
          ? undefined
          : Boolean(adjustment.loanRepaymentOnTime),
      loanRepaymentAmount:
        adjustment.loanRepaymentAmount == null
          ? undefined
          : Number(adjustment.loanRepaymentAmount),
      month: monthKeyFromDate(adjustment.month),
      notes: adjustment.notes ?? undefined,
      status: adjustment.rowStatus ?? undefined,
      savingsContribution:
        adjustment.savingsContribution == null
          ? undefined
          : Number(adjustment.savingsContribution),
    })),
    shareOverrideVersions: shareOverrides.map((item: any) => ({
      amount: Number(item.amount),
      basis: item.basis ?? "after_charge_deductions",
      effectiveFrom: monthKeyFromDate(item.effectiveFrom),
      notes: item.notes ?? undefined,
      valueType: item.valueType ?? "fixed_amount",
    })),
    startMonth: monthKeyFromDate(startMonth),
  }
}

export async function createBackfillBatch(
  input: {
    tenantId: string
    memberId: string
    rangeStart: Date
    rangeEnd: Date
    createdByUserId?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertBackfillMutationOpen(input.tenantId, prisma)

  return prisma.backfillBatch.create({
    data: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      rangeStart: startOfMonth(input.rangeStart),
      rangeEnd: startOfMonth(input.rangeEnd),
      status: "draft",
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.createdByUserId,
    },
  })
}

export async function getBackfillBatch(
  tenantId: string,
  batchId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return null

  return prisma.backfillBatch.findFirst({
    where: {
      id: batchId,
      tenantId,
    },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          memberNumber: true,
        },
      },
      monthRows: {
        include: {
          activities: true,
        },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      },
    },
  })
}

export async function getLatestBackfillBatchForMember(
  tenantId: string,
  memberId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return null

  return prisma.backfillBatch.findFirst({
    where: {
      tenantId,
      memberId,
    },
    include: {
      monthRows: {
        include: {
          activities: true,
        },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  })
}

export async function saveBackfillDraft(
  input: {
    tenantId: string
    memberId: string
    actorUserId?: string
    draftInput: BuildBackfillDraftInput
    draft?: BackfillDraft
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  const canValidateSuppliedDraftBeforeGuard =
    Boolean(input.draft) &&
    typeof input.draftInput.endMonth === "string" &&
    typeof input.draftInput.startMonth === "string"
  let draft = input.draft
  let rangeEnd: Date
  let rangeStart: Date

  if (canValidateSuppliedDraftBeforeGuard && draft) {
    ;({ rangeEnd, rangeStart } = assertBackfillDraftRowsMatchRange({
      draft,
      endMonth: input.draftInput.endMonth,
      startMonth: input.draftInput.startMonth,
    }))
  }

  await assertBackfillMutationOpen(input.tenantId, prisma)

  if (!canValidateSuppliedDraftBeforeGuard) {
    draft = input.draft ?? buildBackfillDraft(input.draftInput)
    ;({ rangeEnd, rangeStart } = assertBackfillDraftRowsMatchRange({
      draft,
      endMonth: input.draftInput.endMonth,
      startMonth: input.draftInput.startMonth,
    }))
  }

  if (!draft) {
    throw new Error("Backfill draft could not be prepared")
  }

  const finalDraft = draft

  return prisma.$transaction(async (tx: any) => {
    await assertMemberBackfillDraftNotAlreadyApplied({
      tenantId: input.tenantId,
      memberId: input.memberId,
      tx,
    })

    const existing = await tx.backfillBatch.findFirst({
      where: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        status: {
          in: ["draft", "generated"],
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    const batch = existing
      ? await tx.backfillBatch.update({
          where: { id: existing.id },
          data: {
            draftInput: input.draftInput,
            generatedAt: new Date(),
            rangeEnd,
            rangeStart,
            status: "generated",
            summary: finalDraft.summary,
            updatedByUserId: input.actorUserId,
            warnings: finalDraft.warnings,
          },
        })
      : await tx.backfillBatch.create({
          data: {
            createdByUserId: input.actorUserId,
            draftInput: input.draftInput,
            generatedAt: new Date(),
            memberId: input.memberId,
            rangeEnd,
            rangeStart,
            status: "generated",
            summary: finalDraft.summary,
            tenantId: input.tenantId,
            updatedByUserId: input.actorUserId,
            warnings: finalDraft.warnings,
          },
        })

    await tx.backfillActivity.deleteMany({
      where: {
        tenantId: input.tenantId,
        batchId: batch.id,
      },
    })

    await tx.backfillMonthRow.deleteMany({
      where: {
        tenantId: input.tenantId,
        batchId: batch.id,
      },
    })

    for (const row of finalDraft.rows) {
      const monthRow = await tx.backfillMonthRow.create({
        data: {
          tenantId: input.tenantId,
          batchId: batch.id,
          year: Number(row.month.slice(0, 4)),
          month: Number(row.month.slice(5, 7)),
          rowStatus: row.status,
          amount: row.amount,
          charge: Object.values(row.chargeValues).reduce<number>(
            (sum, value) => sum + Number(value),
            0
          ),
          chargeBreakdown: row.chargeValues,
          dividend: row.dividend,
          loanCollected: row.loanService,
          loanServiceAmount: row.loanService,
          monthlyTopup: row.loanEvent?.topUp ?? 0,
          pendingLoanPayment: row.pendingLoanPayment,
          share: row.share,
          totalShare: finalDraft.rows
            .filter((candidate: any) => candidate.month <= row.month)
            .reduce<number>(
              (sum, candidate: any) => sum + Number(candidate.share),
              0
            ),
          total: row.netDeposit,
          metadata: {
            dividendLabel: row.dividendLabel ?? null,
            dividendProfitEntryId: row.dividendProfitEntryId ?? null,
            dividendSharePercentage: row.dividendSharePercentage ?? null,
            existingHistoryImpacts: row.existingHistoryImpacts,
            loanEvent: row.loanEvent ?? null,
            monthLabel: row.monthLabel,
            statusReason: row.statusReason ?? null,
          },
          isGenerated: true,
          isEdited: row.isEdited,
        },
      })

      if (row.loanEvent) {
        await tx.backfillActivity.create({
          data: {
            tenantId: input.tenantId,
            batchId: batch.id,
            monthRowId: monthRow.id,
            activityType: "loan_taken",
            activityDate: monthDateFromKey(row.month),
            amount: row.loanEvent.loanAmount,
            direction: "debit",
            metadata: {
              durationMonths: row.loanEvent.durationMonths,
              monthlyLoanServiceAmount: row.loanEvent.monthlyLoanServiceAmount,
              startMonth: row.loanEvent.startMonth,
              status: row.loanEvent.status ?? null,
              topUp: row.loanEvent.topUp,
            },
            createdByUserId: input.actorUserId,
          },
        })
      }

      if (row.dividend > 0) {
        await tx.backfillActivity.create({
          data: {
            tenantId: input.tenantId,
            batchId: batch.id,
            monthRowId: monthRow.id,
            activityType: "profit_dividend",
            activityDate: monthDateFromKey(row.month),
            amount: row.dividend,
            direction: "credit",
            metadata: {
              profitEntryId: row.dividendProfitEntryId ?? null,
              sharePercentage: row.dividendSharePercentage ?? null,
            },
            notes: row.dividendLabel ?? "Dividend context",
            createdByUserId: input.actorUserId,
          },
        })
      }
    }

    return tx.backfillBatch.findFirst({
      where: { id: batch.id, tenantId: input.tenantId },
      include: {
        monthRows: {
          include: {
            activities: true,
          },
          orderBy: [{ year: "asc" }, { month: "asc" }],
        },
      },
    })
  })
}

export async function applyBackfillBatch(
  input: {
    tenantId: string
    batchId?: string
    memberId: string
    actorUserId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertBackfillMutationOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx: any) => {
    async function createAppliedBackfillMonthMarkers(
      batch: any,
      candidateMonths: Array<{ key: string; month: Date }>
    ) {
      if (typeof tx.appliedBackfillMonth?.createMany !== "function") {
        return
      }

      await tx.appliedBackfillMonth.createMany({
        data: candidateMonths.map((candidate: any) => ({
          appliedByUserId: input.actorUserId,
          batchId: batch.id,
          memberId: input.memberId,
          month: candidate.month,
          sourceKey: `backfill:${batch.id}:${candidate.key}`,
          tenantId: input.tenantId,
        })),
        skipDuplicates: true,
      })
    }

    const batch = input.batchId
      ? await tx.backfillBatch.findFirst({
          where: {
            id: input.batchId,
            tenantId: input.tenantId,
            memberId: input.memberId,
          },
          include: {
            monthRows: {
              include: {
                activities: true,
              },
              orderBy: [{ year: "asc" }, { month: "asc" }],
            },
          },
        })
      : await tx.backfillBatch.findFirst({
          where: {
            tenantId: input.tenantId,
            memberId: input.memberId,
            status: {
              in: ["generated", "approved"],
            },
          },
          include: {
            monthRows: {
              include: {
                activities: true,
              },
              orderBy: [{ year: "asc" }, { month: "asc" }],
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        })

    if (!batch) {
      throw new Error("Backfill batch not found")
    }

    const candidateMonthKeys = new Set(
      batch.monthRows.map(
        (row: any) => `${row.year}-${String(row.month).padStart(2, "0")}`
      )
    )
    const candidateMonths = batch.monthRows.map((row: any) => ({
      key: `${row.year}-${String(row.month).padStart(2, "0")}`,
      month: new Date(Date.UTC(row.year, row.month - 1, 1)),
    }))

    if (batch.status === "applied") {
      await createAppliedBackfillMonthMarkers(batch, candidateMonths)
      return batch
    }

    if (!["generated", "approved"].includes(batch.status)) {
      throw new Error(
        "Backfill batch must be generated or approved before it can be applied."
      )
    }

    const duplicateMonthKeys =
      typeof tx.appliedBackfillMonth?.findMany === "function"
        ? (
            await tx.appliedBackfillMonth.findMany({
              select: {
                month: true,
              },
              where: {
                tenantId: input.tenantId,
                memberId: input.memberId,
                batchId: {
                  not: batch.id,
                },
                month: {
                  in: candidateMonths.map((candidate: any) => candidate.month),
                },
              },
            })
          ).map((appliedMonth: any) => monthKeyFromDate(appliedMonth.month))
        : []

    if (duplicateMonthKeys.length === 0) {
      const overlappingAppliedBatches = await tx.backfillBatch.findMany({
        where: {
          tenantId: input.tenantId,
          memberId: input.memberId,
          status: "applied",
          id: {
            not: batch.id,
          },
          rangeStart: {
            lte: batch.rangeEnd,
          },
          rangeEnd: {
            gte: batch.rangeStart,
          },
        },
        include: {
          monthRows: {
            select: {
              month: true,
              year: true,
            },
          },
        },
      })
      duplicateMonthKeys.push(
        ...overlappingAppliedBatches.flatMap((appliedBatch: any) =>
          (appliedBatch.monthRows ?? [])
            .map(
              (row: any) => `${row.year}-${String(row.month).padStart(2, "0")}`
            )
            .filter((monthKey: string) => candidateMonthKeys.has(monthKey))
        )
      )
    }

    if (duplicateMonthKeys.length > 0) {
      throw new Error(
        `Backfill has already been applied for ${duplicateMonthKeys.slice(0, 3).join(", ")}. Use correction or reversal workflows instead of applying another migration batch for the same member/month.`
      )
    }

    const rangeStart = startOfMonth(batch.rangeStart)
    const rangeEnd = endOfMonth(batch.rangeEnd)

    await assertNoExistingMemberFinancialRecordsForRange({
      tenantId: input.tenantId,
      memberId: input.memberId,
      startDate: rangeStart,
      endDate: rangeEnd,
      tx: tx as PrismaClient,
    })

    await deleteMemberLedgerTransactionsForRange({
      tenantId: input.tenantId,
      memberId: input.memberId,
      startDate: rangeStart,
      endDate: rangeEnd,
      tx: tx as PrismaClient,
    })

    await tx.chargeApplication.deleteMany({
      where: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        assessedAt: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
    })

    await tx.contribution.deleteMany({
      where: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        postedAt: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
    })

    await tx.repayment.deleteMany({
      where: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        paidAt: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
    })

    await resetLoanDerivedStateForMember({
      tenantId: input.tenantId,
      memberId: input.memberId,
      tx: tx as PrismaClient,
    })

    let primaryLoan = await tx.loan.findFirst({
      where: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        status: {
          in: ["approved", "disbursed", "active", "completed"],
        },
      },
      orderBy: [{ disbursedAt: "desc" }, { createdAt: "desc" }],
    })

    const loansByEventKey = new Map<string, any>()

    if (!primaryLoan) {
      for (const row of batch.monthRows) {
        const event = ((row.metadata ?? {}) as Record<string, any>).loanEvent

        if (
          !event ||
          Number(
            event.openingOutstandingPrincipalBalance ?? event.loanAmount
          ) <= 0
        ) {
          continue
        }

        const eventKey = legacyLoanEventKey(event)
        if (loansByEventKey.has(eventKey)) continue

        const loan = await createLegacyBackfillLoanFromEvent({
          actorUserId: input.actorUserId,
          event,
          memberId: input.memberId,
          tenantId: input.tenantId,
          tx,
        })
        loansByEventKey.set(eventKey, loan)
      }
    }

    const chargeDefinitions = await tx.chargeDefinition.findMany({
      where: {
        tenantId: input.tenantId,
        isActive: true,
        appliesToMembers: true,
      },
      orderBy: { createdAt: "asc" },
    })

    for (const row of batch.monthRows) {
      const rowMonth = new Date(Date.UTC(row.year, row.month - 1, 1))
      const metadata = (row.metadata ?? {}) as Record<string, any>
      const chargeBreakdown = (row.chargeBreakdown ?? {}) as Record<
        string,
        number
      >

      if (!isSkippedBackfillRow(row.rowStatus) && Number(row.share) > 0) {
        await recordContribution(
          {
            actorUserId: input.actorUserId,
            amount: Number(row.share),
            channel: "manual",
            committedAmount: Number(row.amount),
            extraSavingsAmount: Math.max(
              0,
              Number(row.total) - Number(row.share)
            ),
            memberId: input.memberId,
            notes: "Posted from backfill apply",
            periodLabel: monthKeyFromDate(rowMonth),
            postedAt: rowMonth,
            sourceType: "backfill",
            tenantId: input.tenantId,
          },
          tx as PrismaClient
        )
        await createMemberShareLedgerEntry(
          {
            tenantId: input.tenantId,
            memberId: input.memberId,
            amount: Number(row.share),
            effectiveDate: rowMonth,
            sourceType: "backfill",
            sourceId: row.id,
            notes: `Share posted from backfill ${batch.id}`,
            createdByUserId: input.actorUserId,
          },
          tx as PrismaClient
        )
      }

      for (const [chargeCode, chargeAmount] of Object.entries(
        chargeBreakdown
      )) {
        if (
          !chargeAmount ||
          chargeAmount <= 0 ||
          isSkippedBackfillRow(row.rowStatus)
        )
          continue

        const definition = chargeDefinitions.find(
          (item: any) => item.code === chargeCode
        )
        if (!definition) continue

        await applyCharge(
          {
            actorUserId: input.actorUserId,
            amount: Number(chargeAmount),
            assessedAt: rowMonth,
            chargeDefinitionId: definition.id,
            memberId: input.memberId,
            notes: "Posted from backfill apply",
            sourceType: "backfill",
            tenantId: input.tenantId,
          },
          tx as PrismaClient
        )
      }

      if (
        Number(row.loanServiceAmount) > 0 &&
        !isSkippedBackfillRow(row.rowStatus)
      ) {
        const loanForRow = metadata.loanEvent
          ? (loansByEventKey.get(legacyLoanEventKey(metadata.loanEvent)) ??
            primaryLoan)
          : primaryLoan

        if (!loanForRow) continue

        await postBackfillRepayment({
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          memberId: input.memberId,
          loanId: loanForRow.id,
          amount: Number(row.loanServiceAmount),
          paidAt: rowMonth,
          reference: `backfill-${batch.id}-${row.year}-${row.month}`,
          tx: tx as PrismaClient,
        })
      }

      if (
        Number(row.dividend) > 0 &&
        metadata.dividendProfitEntryId &&
        !isSkippedBackfillRow(row.rowStatus) &&
        typeof tx.shareProfitAllocation?.upsert === "function"
      ) {
        await tx.shareProfitAllocation.upsert({
          create: {
            allocatedProfitAmount: Number(row.dividend),
            memberId: input.memberId,
            memberShareBalance: 0,
            profitEntryId: metadata.dividendProfitEntryId,
            sharePercentage: Number(metadata.dividendSharePercentage ?? 0),
            status: "published",
            tenantId: input.tenantId,
            totalShareBalance: 0,
          },
          update: {
            allocatedProfitAmount: Number(row.dividend),
            sharePercentage: Number(metadata.dividendSharePercentage ?? 0),
            status: "published",
          },
          where: {
            profitEntryId_memberId: {
              memberId: input.memberId,
              profitEntryId: metadata.dividendProfitEntryId,
            },
          },
        })
      }

      if (metadata.loanEvent) {
        await tx.auditLog.create({
          data: {
            tenantId: input.tenantId,
            actorUserId: input.actorUserId,
            actorType: "user",
            action: "loan.backfill_context_recorded",
            entityType: "BackfillMonthRow",
            entityId: row.id,
            metadata: metadata.loanEvent,
            occurredAt: new Date(),
          },
        })
      }
    }

    await recalculateMemberSavingsSnapshot({
      tenantId: input.tenantId,
      memberId: input.memberId,
      tx: tx as PrismaClient,
    })

    await tx.backfillBatch.update({
      where: { id: batch.id },
      data: {
        status: "applied",
        appliedAt: new Date(),
        updatedByUserId: input.actorUserId,
      },
    })

    await createAppliedBackfillMonthMarkers(batch, candidateMonths)

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "backfill.batch_applied",
        entityType: "BackfillBatch",
        entityId: batch.id,
        metadata: {
          memberId: input.memberId,
          rangeStart: rangeStart.toISOString(),
          rangeEnd: rangeEnd.toISOString(),
        },
        occurredAt: new Date(),
      },
    })

    return tx.backfillBatch.findFirst({
      where: { id: batch.id, tenantId: input.tenantId },
      include: {
        monthRows: {
          include: {
            activities: true,
          },
          orderBy: [{ year: "asc" }, { month: "asc" }],
        },
      },
    })
  })
}

export async function generateBackfillBatch(
  input: {
    tenantId: string
    batchId: string
    actorUserId?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertBackfillMutationOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx: any) => {
    const batch = await tx.backfillBatch.findFirst({
      where: {
        id: input.batchId,
        tenantId: input.tenantId,
      },
    })

    if (!batch) {
      throw new Error("Backfill batch not found")
    }

    await tx.backfillActivity.deleteMany({
      where: {
        tenantId: input.tenantId,
        batchId: batch.id,
      },
    })

    await tx.backfillMonthRow.deleteMany({
      where: {
        tenantId: input.tenantId,
        batchId: batch.id,
      },
    })

    const months = eachMonthBetween(batch.rangeStart, batch.rangeEnd)
    let runningShareTotal = 0

    for (const month of months) {
      const [amount, share, chargeTotal, loanSnapshot] = await Promise.all([
        resolveMemberAmountForMonth(
          { tenantId: input.tenantId, memberId: batch.memberId, month },
          tx as unknown as PrismaClient
        ),
        getResolvedShareAmountForMonth(
          { tenantId: input.tenantId, memberId: batch.memberId, month },
          tx as unknown as PrismaClient
        ),
        resolveChargeTotalForMonth(
          { tenantId: input.tenantId, month },
          tx as unknown as PrismaClient
        ),
        resolveLoanSnapshotForMonth(
          { tenantId: input.tenantId, memberId: batch.memberId, month },
          tx as unknown as PrismaClient
        ),
      ])

      runningShareTotal += share

      await tx.backfillMonthRow.create({
        data: {
          tenantId: input.tenantId,
          batchId: batch.id,
          year: month.getUTCFullYear(),
          month: month.getUTCMonth() + 1,
          amount,
          charge: chargeTotal,
          loanCollected: loanSnapshot.loanCollected,
          loanServiceAmount: loanSnapshot.loanServiceAmount,
          monthlyTopup: loanSnapshot.monthlyTopup,
          pendingLoanPayment: loanSnapshot.pendingLoanPayment,
          share,
          totalShare: runningShareTotal,
          total: amount,
          isGenerated: true,
          isEdited: false,
        },
      })
    }

    return tx.backfillBatch.update({
      where: { id: batch.id },
      data: {
        status: "generated",
        generatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      },
      include: {
        monthRows: {
          orderBy: [{ year: "asc" }, { month: "asc" }],
        },
      },
    })
  })
}

export async function updateBackfillMonthRow(
  input: {
    tenantId: string
    monthRowId: string
    amount?: number
    charge?: number
    loanCollected?: number
    loanServiceAmount?: number
    monthlyTopup?: number
    pendingLoanPayment?: number
    share?: number
    totalShare?: number
    total?: number
    notes?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertBackfillMutationOpen(input.tenantId, prisma)

  return prisma.backfillMonthRow.update({
    where: {
      id: input.monthRowId,
      tenantId: input.tenantId,
    },
    data: {
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.charge !== undefined ? { charge: input.charge } : {}),
      ...(input.loanCollected !== undefined
        ? { loanCollected: input.loanCollected }
        : {}),
      ...(input.loanServiceAmount !== undefined
        ? { loanServiceAmount: input.loanServiceAmount }
        : {}),
      ...(input.monthlyTopup !== undefined
        ? { monthlyTopup: input.monthlyTopup }
        : {}),
      ...(input.pendingLoanPayment !== undefined
        ? { pendingLoanPayment: input.pendingLoanPayment }
        : {}),
      ...(input.share !== undefined ? { share: input.share } : {}),
      ...(input.totalShare !== undefined
        ? { totalShare: input.totalShare }
        : {}),
      ...(input.total !== undefined ? { total: input.total } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      isEdited: true,
    },
  })
}

export async function addBackfillActivity(
  input: {
    tenantId: string
    batchId: string
    monthRowId: string
    activityType:
      | "loan_taken"
      | "profit_dividend"
      | "extra_charge"
      | "extra_share"
      | "manual_adjustment"
      | "loan_repayment_adjustment"
    activityDate: Date
    amount: number
    direction?: string
    notes?: string
    metadata?: Record<string, unknown>
    createdByUserId?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertBackfillMutationOpen(input.tenantId, prisma)

  return prisma.backfillActivity.create({
    data: {
      tenantId: input.tenantId,
      batchId: input.batchId,
      monthRowId: input.monthRowId,
      activityType: input.activityType,
      activityDate: input.activityDate,
      amount: input.amount,
      direction: input.direction ?? "credit",
      notes: input.notes,
      metadata: input.metadata,
      createdByUserId: input.createdByUserId,
    },
  })
}

export async function updateBackfillBatchStatus(
  input: {
    tenantId: string
    batchId: string
    status: "draft" | "generated" | "approved" | "applied" | "cancelled"
    actorUserId?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertBackfillMutationOpen(input.tenantId, prisma)

  return prisma.backfillBatch.update({
    where: {
      id: input.batchId,
      tenantId: input.tenantId,
    },
    data: {
      status: input.status,
      approvedAt: input.status === "approved" ? new Date() : undefined,
      appliedAt: input.status === "applied" ? new Date() : undefined,
      updatedByUserId: input.actorUserId,
    },
  })
}
