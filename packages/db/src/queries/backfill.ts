import {
  buildBackfillDraft,
  type BackfillDraft,
  type BackfillProfitPeriod,
  type BuildBackfillDraftInput,
} from "@halaalvest/backfill"
import type { PrismaClient } from "@prisma/client"
import { createPrismaClient } from "../prisma"
import { applyCharge } from "./charges"
import { recordContribution } from "./contributions"
import { getLedgerAccountByCode, postLedgerTransaction } from "./ledger"
import { createMemberShareLedgerEntry, getResolvedShareAmountForMonth } from "./tenant-finance"

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

function monthDateFromKey(value: string) {
  const [yearText, monthText] = value.split("-")
  return new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1))
}

async function resolveMemberAmountForMonth(
  input: {
    tenantId: string
    memberId: string
    month: Date
  },
  prisma: PrismaClient,
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
  prisma: PrismaClient,
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
  prisma: PrismaClient,
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
      loan.repaymentScheduleItems.reduce((rowSum, item) => rowSum + Number(item.totalDue), 0),
    0,
  )
  const pendingLoanPayment = loans.reduce(
    (sum, loan) =>
      sum +
      loan.repaymentScheduleItems.reduce(
        (rowSum, item) => rowSum + Math.max(0, Number(item.totalDue) - Number(item.amountPaid)),
        0,
      ),
    0,
  )
  const monthlyTopup = loans.reduce((sum, loan) => sum + Number(loan.extraMonthlySavingsAmount), 0)

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
  prisma: any,
) {
  const [contributions, chargeApplications, repayments, dividendAllocations] = await Promise.all([
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
  prisma: any,
) {
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

  return allocations.map((allocation: any) => ({
    amount: Number(allocation.allocationAmount),
    label: allocation.dividendPeriod.name,
    month: monthKeyFromDate(allocation.dividendPeriod.periodEnd),
  }))
}

async function buildProfitPeriods(
  input: {
    tenantId: string
    startMonth: Date
    endMonth: Date
  },
  prisma: any,
) {
  const businesses = await prisma.shareBusiness.findMany({
    where: {
      tenantId: input.tenantId,
      startDate: {
        lte: endOfMonth(input.endMonth),
      },
      OR: [
        { endDate: null },
        { endDate: { gte: input.startMonth } },
      ],
    },
    orderBy: [{ startDate: "asc" }],
  })

  return businesses.map(
    (business: any): BackfillProfitPeriod => ({
      distributableAmount: Number(business.profitAmount),
      month: monthKeyFromDate(business.endDate ?? business.startDate),
      notes: business.name,
      totalProfitAmount: Number(business.profitAmount),
    }),
  )
}

async function deleteMemberLedgerTransactionsForRange(
  input: {
    tenantId: string
    memberId: string
    startDate: Date
    endDate: Date
    tx: any
  },
) {
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

async function resetLoanDerivedStateForMember(
  input: {
    tenantId: string
    memberId: string
    tx: any
  },
) {
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

async function allocateRepaymentAcrossScheduleItems(
  input: {
    tenantId: string
    loanId: string
    amount: number
    tx: any
  },
) {
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

async function postBackfillRepayment(
  input: {
    tenantId: string
    actorUserId: string
    memberId: string
    loanId: string
    amount: number
    paidAt: Date
    reference?: string
    tx: any
  },
) {
  const cashAccount = await getLedgerAccountByCode(input.tenantId, "2000", input.tx)
  const loanReceivableAccount = await getLedgerAccountByCode(input.tenantId, "1100", input.tx)

  if (!cashAccount || !loanReceivableAccount) {
    throw new Error("Ledger accounts not initialized for this tenant")
  }

  const loan = await input.tx.loan.findFirst({
    where: { id: input.loanId, tenantId: input.tenantId },
  })

  if (!loan) throw new Error("Loan not found for backfill repayment.")
  if (input.amount > Number(loan.outstandingPrincipal)) {
    throw new Error("Backfill repayment amount exceeds the outstanding loan balance.")
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
      status: Number(loan.outstandingPrincipal) - input.amount <= 0 ? "completed" : "active",
      ...(Number(loan.outstandingPrincipal) - input.amount <= 0 ? { closedAt: input.paidAt } : {}),
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
      entries: [
        { ledgerAccountId: cashAccount.id, direction: "debit", amount: input.amount },
        { ledgerAccountId: loanReceivableAccount.id, direction: "credit", amount: input.amount },
      ],
    },
    input.tx,
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

async function recalculateMemberSavingsSnapshot(
  input: {
    tenantId: string
    memberId: string
    tx: any
  },
) {
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
    (sum: number, item: any) => sum + Number(item.amount) + Number(item.extraSavingsAmount),
    0,
  )
  const totalCharges = charges.reduce((sum: number, item: any) => sum + Number(item.amount), 0)
  const totalDividends = dividends.reduce((sum: number, item: any) => sum + Number(item.allocationAmount), 0)

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
  prismaOverride?: PrismaClient,
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

export async function buildBackfillDraftInputForMember(
  input: {
    tenantId: string
    memberId: string
    startMonth?: Date
    endMonth?: Date
  },
  prismaOverride?: PrismaClient,
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

  const startMonth = startOfMonth(input.startMonth ?? member.tenant.startDate ?? member.joinedAt)
  const endMonth = startOfMonth(input.endMonth ?? new Date())

  const [amountLogs, shareOverrides, defaultShareVersions, chargeDefinitions, dividendEntries, existingHistoryImpacts, profitPeriods] =
    await Promise.all([
      prisma.memberAmountLog.findMany({
        where: { tenantId: input.tenantId, memberId: input.memberId },
        orderBy: { effectiveFrom: "asc" },
      }),
      prisma.memberShareOverride.findMany({
        where: { tenantId: input.tenantId, memberId: input.memberId },
        orderBy: { effectiveFrom: "asc" },
      }),
      prisma.tenantShareStructureVersion.findMany({
        where: { tenantId: input.tenantId },
        orderBy: { effectiveFrom: "asc" },
      }),
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
        prisma as PrismaClient,
      ),
      collectExistingHistoryImpacts(
        {
          tenantId: input.tenantId,
          memberId: input.memberId,
          startMonth,
          endMonth,
        },
        prisma as PrismaClient,
      ),
      buildProfitPeriods(
        {
          tenantId: input.tenantId,
          startMonth,
          endMonth,
        },
        prisma as PrismaClient,
      ),
    ])

  return {
    amountLogs: amountLogs.map((item: any) => ({
      amount: Number(item.amount),
      effectiveFrom: monthKeyFromDate(item.effectiveFrom),
      notes: item.notes ?? undefined,
    })),
    chargeDefinitions: chargeDefinitions.map((definition: any) => ({
      code: definition.code,
      label: definition.name,
      versions: definition.versions.map((version: any) => ({
        amount: Number(version.amount),
        effectiveFrom: monthKeyFromDate(version.effectiveFrom),
      })),
    })),
    defaultShareVersions: defaultShareVersions.map((item: any) => ({
      amount: Number(item.amount),
      effectiveFrom: monthKeyFromDate(item.effectiveFrom),
      notes: item.notes ?? undefined,
    })),
    dividendEntries,
    endMonth: monthKeyFromDate(endMonth),
    existingHistoryImpacts,
    loanEvents: [],
    memberJoinedMonth: monthKeyFromDate(startOfMonth(member.joinedAt)),
    profitPeriods,
    shareOverrideVersions: shareOverrides.map((item: any) => ({
      amount: Number(item.amount),
      effectiveFrom: monthKeyFromDate(item.effectiveFrom),
      notes: item.notes ?? undefined,
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
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

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
  prismaOverride?: PrismaClient,
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
  prismaOverride?: PrismaClient,
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
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const draft = input.draft ?? buildBackfillDraft(input.draftInput)
  const rangeStart = monthDateFromKey(input.draftInput.startMonth)
  const rangeEnd = monthDateFromKey(input.draftInput.endMonth)

  return prisma.$transaction(async (tx: any) => {
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
            summary: draft.summary,
            updatedByUserId: input.actorUserId,
            warnings: draft.warnings,
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
            summary: draft.summary,
            tenantId: input.tenantId,
            updatedByUserId: input.actorUserId,
            warnings: draft.warnings,
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

    for (const row of draft.rows) {
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
            0,
          ),
          chargeBreakdown: row.chargeValues,
          dividend: row.dividend,
          loanCollected: row.loanService,
          loanServiceAmount: row.loanService,
          monthlyTopup: row.loanEvent?.topUp ?? 0,
          pendingLoanPayment: row.pendingLoanPayment,
          share: row.share,
          totalShare: draft.rows
            .filter((candidate: any) => candidate.month <= row.month)
            .reduce<number>((sum, candidate: any) => sum + Number(candidate.share), 0),
          total: row.netDeposit,
          metadata: {
            dividendLabel: row.dividendLabel ?? null,
            existingHistoryImpacts: row.existingHistoryImpacts,
            loanEvent: row.loanEvent ?? null,
            monthLabel: row.monthLabel,
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
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  return prisma.$transaction(async (tx: any) => {
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
              in: ["draft", "generated", "approved"],
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

    const rangeStart = startOfMonth(batch.rangeStart)
    const rangeEnd = endOfMonth(batch.rangeEnd)

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

    const primaryLoan = await tx.loan.findFirst({
      where: {
        tenantId: input.tenantId,
        memberId: input.memberId,
        status: {
          in: ["approved", "disbursed", "active", "completed"],
        },
      },
      orderBy: [{ disbursedAt: "desc" }, { createdAt: "desc" }],
    })

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
      const chargeBreakdown = (row.chargeBreakdown ?? {}) as Record<string, number>

      if (row.rowStatus !== "missed" && Number(row.share) > 0) {
        await recordContribution(
          {
            actorUserId: input.actorUserId,
            amount: Number(row.share),
            channel: "manual",
            committedAmount: Number(row.amount),
            extraSavingsAmount: Math.max(0, Number(row.total) - Number(row.share)),
            memberId: input.memberId,
            notes: "Posted from backfill apply",
            periodLabel: monthKeyFromDate(rowMonth),
            postedAt: rowMonth,
            tenantId: input.tenantId,
          },
          tx as PrismaClient,
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
          tx as PrismaClient,
        )
      }

      for (const [chargeCode, chargeAmount] of Object.entries(chargeBreakdown)) {
        if (!chargeAmount || chargeAmount <= 0 || row.rowStatus === "missed") continue

        const definition = chargeDefinitions.find((item: any) => item.code === chargeCode)
        if (!definition) continue

        await applyCharge(
          {
            actorUserId: input.actorUserId,
            amount: Number(chargeAmount),
            assessedAt: rowMonth,
            chargeDefinitionId: definition.id,
            memberId: input.memberId,
            notes: "Posted from backfill apply",
            tenantId: input.tenantId,
          },
          tx as PrismaClient,
        )
      }

      if (primaryLoan && Number(row.loanServiceAmount) > 0 && row.rowStatus !== "missed") {
        await postBackfillRepayment(
          {
            tenantId: input.tenantId,
            actorUserId: input.actorUserId,
            memberId: input.memberId,
            loanId: primaryLoan.id,
            amount: Number(row.loanServiceAmount),
            paidAt: rowMonth,
            reference: `backfill-${batch.id}-${row.year}-${row.month}`,
            tx: tx as PrismaClient,
          },
        )
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
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

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
          tx as unknown as PrismaClient,
        ),
        getResolvedShareAmountForMonth(
          { tenantId: input.tenantId, memberId: batch.memberId, month },
          tx as unknown as PrismaClient,
        ),
        resolveChargeTotalForMonth({ tenantId: input.tenantId, month }, tx as unknown as PrismaClient),
        resolveLoanSnapshotForMonth(
          { tenantId: input.tenantId, memberId: batch.memberId, month },
          tx as unknown as PrismaClient,
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
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  return prisma.backfillMonthRow.update({
    where: {
      id: input.monthRowId,
      tenantId: input.tenantId,
    },
    data: {
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.charge !== undefined ? { charge: input.charge } : {}),
      ...(input.loanCollected !== undefined ? { loanCollected: input.loanCollected } : {}),
      ...(input.loanServiceAmount !== undefined ? { loanServiceAmount: input.loanServiceAmount } : {}),
      ...(input.monthlyTopup !== undefined ? { monthlyTopup: input.monthlyTopup } : {}),
      ...(input.pendingLoanPayment !== undefined ? { pendingLoanPayment: input.pendingLoanPayment } : {}),
      ...(input.share !== undefined ? { share: input.share } : {}),
      ...(input.totalShare !== undefined ? { totalShare: input.totalShare } : {}),
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
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

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
  prismaOverride?: PrismaClient,
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

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
