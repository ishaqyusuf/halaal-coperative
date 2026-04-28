import type { PrismaClient } from "@prisma/client"
import { createPrismaClient } from "../prisma"
import { getResolvedShareAmountForMonth } from "./tenant-finance"

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
