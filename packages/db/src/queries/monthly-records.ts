import type { LoanStatus, PrismaClient } from "@prisma/client"
import { createPrismaClient } from "../prisma"
import { applyCharge } from "./charges"
import { recordMemberPayment } from "./contributions"
import { getLedgerAccountByCode, postLedgerTransaction } from "./ledger"
import { getTenantInitialMigrationState } from "./migration"

export type MonthlyRecordMemberStatusValue = "pending" | "applied" | "cancelled"
export type MonthlyRecordStatusValue = "draft" | "open" | "closed"
const activeMonthlyRecordLoanStatuses: LoanStatus[] = [
  "approved",
  "active",
  "disbursed",
]
const defaultGenerationDayOfMonth = 1

async function assertLiveFinancialWritesOpen(
  tenantId: string,
  prisma: PrismaClient
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw new Error(
      "Live financial record writes are locked until initial migration is finalized."
    )
  }
}

export type MonthlyRecordSummary = {
  id: string
  periodYear: number
  periodMonth: number
  periodLabel: string
  status: MonthlyRecordStatusValue
  recordedCount: number
  pendingCount: number
  cancelledCount: number
  totalMembers: number
  totalPayableAmount: number
  totalReceivedAmount: number
}

export type MonthlyRecordSettingView = {
  autoGenerateEnabled: boolean
  generationDayOfMonth: number
}

export type MonthlyRecordMemberRow = {
  allChargesAmount: number
  actualChargesAmount: number
  calculatedChargesAmount: number
  contributionAmount: number
  finalIncomeAmount: number
  actualFinalIncomeAmount: number
  calculatedFinalIncomeAmount: number
  hasChargeDifference: boolean
  hasFinalIncomeDifference: boolean
  id: string
  memberId: string
  memberNumber: string
  memberName: string
  currentBalance: number
  loanRepaymentAmount: number
  loanStatus: string
  shareChargeAmount: number
  totalPayableAmount: number
  totalPaidAmount: number
  status: MonthlyRecordMemberStatusValue
}

export type MonthlyRecordChargeBreakdown = {
  id: string
  name: string
  code: string
  kind: "fixed" | "percentage"
  amount: number
  appliedTotalAmount: number
  hasDifference: boolean
  memberCount: number
  totalAmount: number
}

export type MonthlyRecordDetail = MonthlyRecordSummary & {
  chargeBreakdown: MonthlyRecordChargeBreakdown[]
  totalChargeAmount: number
  rows: MonthlyRecordMemberRow[]
}

function getPeriodLabel(year: number, month: number) {
  const date = new Date(Date.UTC(year, month - 1, 1))
  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date)
}

function getPeriodRange(year: number, month: number) {
  return {
    end: new Date(Date.UTC(year, month, 1)),
    start: new Date(Date.UTC(year, month - 1, 1)),
  }
}

function allocateMonthlyRecordPayment(input: {
  contributionTarget: number
  loanTarget: number
  paymentAllocationPreference?: string
  totalPaidAmount: number
}) {
  if (input.paymentAllocationPreference === "loan_first") {
    const scheduledLoanServicingAmount = Math.min(
      input.loanTarget,
      input.totalPaidAmount
    )
    const remainingAfterLoan = Math.max(
      0,
      input.totalPaidAmount - scheduledLoanServicingAmount
    )
    const contributionAmount = Math.min(
      input.contributionTarget,
      remainingAfterLoan
    )

    return {
      contributionAmount,
      extraSavingsAmount: Math.max(
        0,
        input.totalPaidAmount -
          scheduledLoanServicingAmount -
          contributionAmount
      ),
      scheduledLoanServicingAmount,
    }
  }

  const contributionAmount = Math.min(
    input.contributionTarget,
    input.totalPaidAmount
  )
  const remainingAfterContribution = Math.max(
    0,
    input.totalPaidAmount - contributionAmount
  )
  const scheduledLoanServicingAmount = Math.min(
    input.loanTarget,
    remainingAfterContribution
  )

  return {
    contributionAmount,
    extraSavingsAmount: Math.max(
      0,
      input.totalPaidAmount - contributionAmount - scheduledLoanServicingAmount
    ),
    scheduledLoanServicingAmount,
  }
}

function summarizeRows(record: {
  id: string
  periodYear: number
  periodMonth: number
  periodLabel: string
  status: string
  memberRows: Array<{
    calculatedPayableAmount: unknown
    status: string
    totalPaidAmount: unknown
  }>
}): MonthlyRecordSummary {
  const recordedRows = record.memberRows.filter(
    (row) => row.status === "applied"
  )
  const pendingRows = record.memberRows.filter(
    (row) => row.status === "pending"
  )
  const cancelledRows = record.memberRows.filter(
    (row) => row.status === "cancelled"
  )

  return {
    id: record.id,
    periodYear: record.periodYear,
    periodMonth: record.periodMonth,
    periodLabel: record.periodLabel,
    status: record.status as MonthlyRecordStatusValue,
    recordedCount: recordedRows.length,
    pendingCount: pendingRows.length,
    cancelledCount: cancelledRows.length,
    totalMembers: record.memberRows.length,
    totalPayableAmount: record.memberRows.reduce(
      (total, row) => total + Number(row.calculatedPayableAmount),
      0
    ),
    totalReceivedAmount: recordedRows.reduce(
      (total, row) => total + Number(row.totalPaidAmount),
      0
    ),
  }
}

function assertPeriod(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Enter a valid record year.")
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Enter a valid record month.")
  }
}

function clampGenerationDay(day: number) {
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    throw new Error("Monthly record generation day must be between 1 and 28.")
  }

  return day
}

function settingView(row: {
  autoGenerateEnabled: boolean
  generationDayOfMonth: number
}): MonthlyRecordSettingView {
  return {
    autoGenerateEnabled: row.autoGenerateEnabled,
    generationDayOfMonth: row.generationDayOfMonth,
  }
}

export async function getMonthlyRecordSettings(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<MonthlyRecordSettingView> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const row = await (prisma as any).monthlyRecordSetting.upsert({
    where: { tenantId },
    create: {
      tenantId,
      autoGenerateEnabled: true,
      generationDayOfMonth: defaultGenerationDayOfMonth,
    },
    update: {},
  })

  return settingView(row)
}

export async function updateMonthlyRecordSettings(
  input: {
    autoGenerateEnabled: boolean
    generationDayOfMonth: number
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<MonthlyRecordSettingView> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const row = await (prisma as any).monthlyRecordSetting.upsert({
    where: { tenantId: input.tenantId },
    create: {
      tenantId: input.tenantId,
      autoGenerateEnabled: input.autoGenerateEnabled,
      generationDayOfMonth: clampGenerationDay(input.generationDayOfMonth),
    },
    update: {
      autoGenerateEnabled: input.autoGenerateEnabled,
      generationDayOfMonth: clampGenerationDay(input.generationDayOfMonth),
    },
  })

  return settingView(row)
}

export async function listMonthlyRecords(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<MonthlyRecordSummary[]> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const records = await prisma.monthlyRecord.findMany({
    where: { tenantId },
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
  })

  return records.map(summarizeRows)
}

async function seedMonthlyRecordMembers(input: {
  monthlyRecordId: string
  tenantId: string
  year: number
  month: number
  prisma: PrismaClient
}) {
  await assertLiveFinancialWritesOpen(input.tenantId, input.prisma)

  const { end, start } = getPeriodRange(input.year, input.month)
  const members = await input.prisma.member.findMany({
    where: {
      tenantId: input.tenantId,
      status: { not: "exited" },
    },
    include: {
      contributionPlans: {
        where: {
          interval: "monthly",
          isActive: true,
          startsAt: { lt: end },
          OR: [{ endsAt: null }, { endsAt: { gte: start } }],
        },
        orderBy: { startsAt: "desc" },
        take: 1,
      },
      loans: {
        where: {
          outstandingPrincipal: { gt: 0 },
          status: { in: activeMonthlyRecordLoanStatuses },
        },
        include: {
          repaymentScheduleItems: {
            where: {
              dueAt: { lt: end },
              status: { in: ["pending", "due", "overdue", "partially_paid"] },
            },
            orderBy: { installmentNumber: "asc" },
          },
        },
        orderBy: [{ disbursedAt: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: [{ memberNumber: "asc" }, { fullName: "asc" }],
  })
  const shareChargeDefinition = await input.prisma.chargeDefinition.findFirst({
    where: {
      tenantId: input.tenantId,
      appliesToMembers: true,
      isActive: true,
      purpose: "member_share",
    } as any,
    orderBy: [{ isMonthlyLevy: "desc" }, { createdAt: "asc" }],
  })
  const shareChargeAmount = shareChargeDefinition
    ? Number(shareChargeDefinition.amount)
    : 0

  for (const member of members) {
    const plan = member.contributionPlans[0]
    const contributionAmount = plan ? Number(plan.amount) : 0
    const loan =
      member.loans.find((item) => item.repaymentScheduleItems.length > 0) ??
      member.loans[0]
    const loanPayable = loan
      ? Math.min(
          Number(loan.outstandingPrincipal),
          loan.repaymentScheduleItems.reduce(
            (total, item) =>
              total +
              Math.max(0, Number(item.totalDue) - Number(item.amountPaid)),
            0
          )
        )
      : 0
    const calculatedPayableAmount = contributionAmount + loanPayable

    const existingRow = await input.prisma.monthlyRecordMember.findUnique({
      where: {
        monthlyRecordId_memberId: {
          memberId: member.id,
          monthlyRecordId: input.monthlyRecordId,
        },
      },
    })

    if (!existingRow) {
      await input.prisma.monthlyRecordMember.create({
        data: {
          tenantId: input.tenantId,
          monthlyRecordId: input.monthlyRecordId,
          memberId: member.id,
          contributionPlanId: plan?.id,
          loanId: loan?.id,
          calculatedPayableAmount,
          contributionAmount,
          shareChargeAmount,
          loanRepaymentAmount: loanPayable,
          totalPaidAmount: calculatedPayableAmount,
        },
      })
      continue
    }

    if (existingRow.status === "pending") {
      await input.prisma.monthlyRecordMember.update({
        where: { id: existingRow.id },
        data: {
          contributionPlanId: plan?.id,
          loanId: loan?.id,
          calculatedPayableAmount,
          contributionAmount,
          shareChargeAmount,
          loanRepaymentAmount: loanPayable,
          totalPaidAmount: calculatedPayableAmount,
        },
      })
    }
  }
}

export async function ensureMonthlyRecord(
  input: {
    actorUserId: string
    tenantId: string
    year: number
    month: number
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  assertPeriod(input.year, input.month)
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const record = await prisma.monthlyRecord.upsert({
    where: {
      tenantId_periodYear_periodMonth: {
        tenantId: input.tenantId,
        periodYear: input.year,
        periodMonth: input.month,
      },
    },
    create: {
      tenantId: input.tenantId,
      periodYear: input.year,
      periodMonth: input.month,
      periodLabel: getPeriodLabel(input.year, input.month),
      createdByUserId: input.actorUserId,
      status: "open",
    },
    update: {},
  })

  await seedMonthlyRecordMembers({
    monthlyRecordId: record.id,
    tenantId: input.tenantId,
    year: input.year,
    month: input.month,
    prisma,
  })

  return record
}

export async function ensureMemberInGeneratedMonthlyRecord(
  input: {
    joinedAt: Date
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const prismaWithMonthlyRecords = prisma as unknown as {
    monthlyRecord?: {
      findUnique: PrismaClient["monthlyRecord"]["findUnique"]
    }
    monthlyRecordMember?: {
      findUnique: PrismaClient["monthlyRecordMember"]["findUnique"]
    }
  }
  const monthlyRecordDelegate = prismaWithMonthlyRecords.monthlyRecord
  const monthlyRecordMemberDelegate =
    prismaWithMonthlyRecords.monthlyRecordMember

  if (!monthlyRecordDelegate || !monthlyRecordMemberDelegate) {
    return null
  }

  const migrationState = await getTenantInitialMigrationState(
    input.tenantId,
    prisma
  )
  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    return null
  }

  const year = input.joinedAt.getUTCFullYear()
  const month = input.joinedAt.getUTCMonth() + 1
  const record = await monthlyRecordDelegate.findUnique({
    where: {
      tenantId_periodYear_periodMonth: {
        tenantId: input.tenantId,
        periodMonth: month,
        periodYear: year,
      },
    },
  })

  if (!record || record.status === "closed") {
    return null
  }

  await seedMonthlyRecordMembers({
    monthlyRecordId: record.id,
    month,
    prisma,
    tenantId: input.tenantId,
    year,
  })

  return monthlyRecordMemberDelegate.findUnique({
    where: {
      monthlyRecordId_memberId: {
        memberId: input.memberId,
        monthlyRecordId: record.id,
      },
    },
  })
}

export async function generateDueMonthlyRecords(
  input: {
    actorUserId: string
    now?: Date
    tenantId?: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const now = input.now ?? new Date()
  const dayOfMonth = now.getUTCDate()
  const tenants = await prisma.tenant.findMany({
    where: {
      ...(input.tenantId ? { id: input.tenantId } : {}),
      initialMigrationStatus: "live_operations",
      status: "active",
    },
    select: { id: true },
  })
  const generated: Array<{ monthlyRecordId: string; tenantId: string }> = []
  const skipped: Array<{ reason: string; tenantId: string }> = []

  for (const tenant of tenants) {
    const settings = await getMonthlyRecordSettings(tenant.id, prisma)
    if (!settings.autoGenerateEnabled) {
      skipped.push({ reason: "disabled", tenantId: tenant.id })
      continue
    }

    if (dayOfMonth < settings.generationDayOfMonth) {
      skipped.push({ reason: "not_due", tenantId: tenant.id })
      continue
    }

    const record = await ensureMonthlyRecord(
      {
        actorUserId: input.actorUserId,
        month: now.getUTCMonth() + 1,
        tenantId: tenant.id,
        year: now.getUTCFullYear(),
      },
      prisma
    )

    generated.push({ monthlyRecordId: record.id, tenantId: tenant.id })
  }

  return { generated, skipped }
}

export async function getMonthlyRecordDetail(
  tenantId: string,
  monthlyRecordId: string,
  prismaOverride?: PrismaClient
): Promise<MonthlyRecordDetail | null> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const existingRecord = await prisma.monthlyRecord.findFirst({
    where: { id: monthlyRecordId, tenantId },
    select: {
      id: true,
      periodMonth: true,
      periodYear: true,
    },
  })

  if (!existingRecord) return null

  await seedMonthlyRecordMembers({
    monthlyRecordId: existingRecord.id,
    tenantId,
    year: existingRecord.periodYear,
    month: existingRecord.periodMonth,
    prisma,
  })

  const record = await prisma.monthlyRecord.findFirst({
    where: { id: monthlyRecordId, tenantId },
    include: {
      memberRows: {
        include: {
          member: {
            select: {
              fullName: true,
              id: true,
              memberNumber: true,
              totalSavingsSnapshot: true,
            },
          },
        },
        orderBy: [
          { member: { memberNumber: "asc" } },
          { member: { fullName: "asc" } },
        ],
      },
    },
  })

  if (!record) return null

  const { end, start } = getPeriodRange(record.periodYear, record.periodMonth)
  const loanIds = record.memberRows
    .map((row) => row.loanId)
    .filter((loanId): loanId is string => Boolean(loanId))
  const memberIds = record.memberRows.map((row) => row.memberId)
  const loanLookupWhere =
    loanIds.length > 0
      ? {
          tenantId,
          OR: [
            { id: { in: loanIds } },
            {
              memberId: { in: memberIds },
              outstandingPrincipal: { gt: 0 },
              status: { in: activeMonthlyRecordLoanStatuses },
            },
          ],
        }
      : {
          memberId: { in: memberIds },
          outstandingPrincipal: { gt: 0 },
          status: { in: activeMonthlyRecordLoanStatuses },
          tenantId,
        }
  const loans = memberIds.length
    ? await prisma.loan.findMany({
        where: loanLookupWhere,
        select: { id: true, memberId: true, status: true },
        orderBy: [{ disbursedAt: "desc" }, { createdAt: "desc" }],
      })
    : []
  const loanStatusById = new Map(loans.map((loan) => [loan.id, loan.status]))
  const activeLoanByMemberId = new Map<string, (typeof loans)[number]>()
  for (const loan of loans) {
    if (!activeLoanByMemberId.has(loan.memberId)) {
      activeLoanByMemberId.set(loan.memberId, loan)
    }
  }
  const memberChargeDefinitions = await prisma.chargeDefinition.findMany({
    where: {
      tenantId,
      appliesToMembers: true,
      isActive: true,
    },
    orderBy: [{ isMonthlyLevy: "desc" }, { name: "asc" }],
  })
  const totalPaidByMemberId = new Map(
    record.memberRows.map((row) => [row.memberId, Number(row.totalPaidAmount)])
  )
  const calculateChargeAmount = (
    amount: number,
    kind: string,
    memberId: string
  ) =>
    kind === "percentage"
      ? (totalPaidByMemberId.get(memberId) ?? 0) * (amount / 100)
      : amount
  const calculatedChargesByMemberId = new Map<string, number>()

  for (const row of record.memberRows) {
    calculatedChargesByMemberId.set(
      row.memberId,
      memberChargeDefinitions.reduce(
        (total, charge) =>
          total +
          calculateChargeAmount(
            Number(charge.amount),
            charge.kind,
            row.memberId
          ),
        0
      )
    )
  }
  const appliedCharges = memberIds.length
    ? await prisma.chargeApplication.findMany({
        where: {
          tenantId,
          memberId: { in: memberIds },
          status: "posted",
          assessedAt: { gte: start, lt: end },
        },
        select: {
          amount: true,
          chargeDefinitionId: true,
          memberId: true,
        },
      })
    : []
  const actualChargesByMemberId = new Map<string, number>()
  const actualChargesByDefinitionId = new Map<string, number>()

  for (const charge of appliedCharges) {
    actualChargesByMemberId.set(
      charge.memberId,
      (actualChargesByMemberId.get(charge.memberId) ?? 0) +
        Number(charge.amount)
    )
    actualChargesByDefinitionId.set(
      charge.chargeDefinitionId,
      (actualChargesByDefinitionId.get(charge.chargeDefinitionId) ?? 0) +
        Number(charge.amount)
    )
  }

  const chargeBreakdown = memberChargeDefinitions.map((charge) => {
    const amount = Number(charge.amount)
    const totalAmount = record.memberRows.reduce(
      (total, row) =>
        total + calculateChargeAmount(amount, charge.kind, row.memberId),
      0
    )
    const appliedTotalAmount = actualChargesByDefinitionId.get(charge.id) ?? 0

    return {
      id: charge.id,
      name: charge.name,
      code: charge.code,
      kind: charge.kind,
      amount,
      appliedTotalAmount,
      hasDifference: Math.abs(appliedTotalAmount - totalAmount) > 0.009,
      memberCount: record.memberRows.length,
      totalAmount,
    }
  })
  const totalChargeAmount = chargeBreakdown.reduce(
    (total, charge) => total + charge.totalAmount,
    0
  )

  return {
    ...summarizeRows(record),
    chargeBreakdown,
    totalChargeAmount,
    rows: record.memberRows.map((row) => {
      const totalPaidAmount = Number(row.totalPaidAmount)
      const actualChargesAmount = actualChargesByMemberId.get(row.memberId) ?? 0
      const calculatedChargesAmount =
        calculatedChargesByMemberId.get(row.memberId) ?? 0
      const isApplied = row.status === "applied"
      const allChargesAmount = isApplied
        ? actualChargesAmount
        : calculatedChargesAmount
      const actualFinalIncomeAmount = totalPaidAmount - actualChargesAmount
      const calculatedFinalIncomeAmount =
        totalPaidAmount - calculatedChargesAmount
      const finalIncomeAmount = isApplied
        ? actualFinalIncomeAmount
        : calculatedFinalIncomeAmount

      const loanStatus = row.loanId
        ? (loanStatusById.get(row.loanId) ?? "active")
        : activeLoanByMemberId.get(row.memberId)?.status

      return {
        allChargesAmount,
        actualChargesAmount,
        calculatedChargesAmount,
        contributionAmount: Number(row.contributionAmount),
        finalIncomeAmount,
        actualFinalIncomeAmount,
        calculatedFinalIncomeAmount,
        hasChargeDifference:
          isApplied &&
          Math.abs(actualChargesAmount - calculatedChargesAmount) > 0.009,
        hasFinalIncomeDifference:
          isApplied &&
          Math.abs(actualFinalIncomeAmount - calculatedFinalIncomeAmount) >
            0.009,
        id: row.id,
        memberId: row.member.id,
        memberNumber: row.member.memberNumber,
        memberName: row.member.fullName,
        currentBalance: Number(row.member.totalSavingsSnapshot),
        loanRepaymentAmount: Number(row.loanRepaymentAmount),
        loanStatus: loanStatus ?? "none",
        shareChargeAmount: Number((row as any).shareChargeAmount ?? 0),
        totalPayableAmount: Number(row.calculatedPayableAmount),
        totalPaidAmount,
        status: row.status as MonthlyRecordMemberStatusValue,
      }
    }),
  }
}

export async function getOrCreateMonthlyRecordsPageData(
  input: {
    actorUserId: string
    selectedRecordId?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  let summaries = await listMonthlyRecords(input.tenantId, prisma)

  if (summaries.length === 0) {
    const now = new Date()
    const record = await ensureMonthlyRecord(
      {
        actorUserId: input.actorUserId,
        tenantId: input.tenantId,
        year: now.getUTCFullYear(),
        month: now.getUTCMonth() + 1,
      },
      prisma
    )
    summaries = await listMonthlyRecords(input.tenantId, prisma)
    input.selectedRecordId = record.id
  }

  const selectedRecordId = input.selectedRecordId ?? summaries[0]?.id
  const selectedRecord = selectedRecordId
    ? await getMonthlyRecordDetail(input.tenantId, selectedRecordId, prisma)
    : null
  summaries = await listMonthlyRecords(input.tenantId, prisma)

  return {
    records: summaries,
    selectedRecord,
    settings: await getMonthlyRecordSettings(input.tenantId, prisma),
  }
}

export async function applyMonthlyRecordMember(
  input: {
    actorUserId: string
    monthlyRecordMemberId: string
    tenantId: string
    totalPaidAmount: number
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  if (!Number.isFinite(input.totalPaidAmount) || input.totalPaidAmount <= 0) {
    throw new Error("Enter a payment amount greater than zero.")
  }
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const row = await prisma.monthlyRecordMember.findFirst({
    where: {
      id: input.monthlyRecordMemberId,
      tenantId: input.tenantId,
    },
    include: {
      monthlyRecord: true,
    },
  })

  if (!row) throw new Error("Monthly record member row not found.")
  if (row.status === "applied")
    throw new Error("This monthly record row has already been applied.")
  if (row.monthlyRecord.status === "closed")
    throw new Error("Closed monthly records cannot be changed.")

  const member = await prisma.member.findFirst({
    where: {
      id: row.memberId,
      tenantId: input.tenantId,
    },
    select: {
      paymentAllocationPreference: true,
    },
  })

  if (!member) throw new Error("Member not found.")

  const {
    contributionAmount,
    extraSavingsAmount,
    scheduledLoanServicingAmount,
  } = allocateMonthlyRecordPayment({
    contributionTarget: Number(row.contributionAmount),
    loanTarget: Number(row.loanRepaymentAmount),
    paymentAllocationPreference: member.paymentAllocationPreference,
    totalPaidAmount: input.totalPaidAmount,
  })

  const posted = await recordMemberPayment(
    {
      actorUserId: input.actorUserId,
      channel: "manual",
      committedSavingsAmount: contributionAmount,
      contributionPlanId: row.contributionPlanId ?? undefined,
      extraSavingsAmount,
      loanId:
        scheduledLoanServicingAmount > 0
          ? (row.loanId ?? undefined)
          : undefined,
      memberId: row.memberId,
      periodLabel: row.monthlyRecord.periodLabel,
      postedAt: getPeriodRange(
        row.monthlyRecord.periodYear,
        row.monthlyRecord.periodMonth
      ).start,
      reference: `monthly-record:${row.monthlyRecord.id}:${row.id}`,
      scheduledLoanServicingAmount,
      tenantId: input.tenantId,
    },
    prisma
  )
  const memberChargeDefinitions = await prisma.chargeDefinition.findMany({
    where: {
      tenantId: input.tenantId,
      appliesToMembers: true,
      isActive: true,
    },
    orderBy: [{ isMonthlyLevy: "desc" }, { name: "asc" }],
  })
  const assessedAt = getPeriodRange(
    row.monthlyRecord.periodYear,
    row.monthlyRecord.periodMonth
  ).start

  for (const charge of memberChargeDefinitions) {
    const amount =
      charge.kind === "percentage"
        ? input.totalPaidAmount * (Number(charge.amount) / 100)
        : Number(charge.amount)

    if (amount <= 0) continue

    await applyCharge(
      {
        actorUserId: input.actorUserId,
        amount,
        assessedAt,
        chargeDefinitionId: charge.id,
        memberId: row.memberId,
        notes: `Posted from monthly record ${row.monthlyRecord.periodLabel}`,
        tenantId: input.tenantId,
      },
      prisma
    )
  }

  return prisma.monthlyRecordMember.update({
    where: { id: row.id },
    data: {
      appliedAt: new Date(),
      cancelledAt: null,
      contributionId: posted.contributionId,
      repaymentId: posted.repaymentId,
      status: "applied",
      totalPaidAmount: input.totalPaidAmount,
    },
  })
}

async function reverseMonthlyContribution(input: {
  actorUserId: string
  contributionId: string
  tenantId: string
  tx: PrismaClient
}) {
  const contribution = await input.tx.contribution.findFirst({
    where: {
      id: input.contributionId,
      tenantId: input.tenantId,
    },
  })

  if (!contribution || contribution.status === "reversed") return

  const amount = Number(contribution.amount)
  const cashAccount = await getLedgerAccountByCode(
    input.tenantId,
    "2000",
    input.tx
  )
  const savingsAccount = await getLedgerAccountByCode(
    input.tenantId,
    "1000",
    input.tx
  )

  if (!cashAccount || !savingsAccount) {
    throw new Error("Ledger accounts not initialized for this tenant")
  }

  await input.tx.contribution.update({
    where: { id: contribution.id },
    data: { status: "reversed" },
  })

  await input.tx.member.update({
    where: { id: contribution.memberId, tenantId: input.tenantId },
    data: {
      totalSavingsSnapshot: { decrement: amount },
    },
  })

  await postLedgerTransaction(
    {
      tenantId: input.tenantId,
      transactionType: "adjustment",
      postedAt: new Date(),
      memberId: contribution.memberId,
      reference: `monthly-record-cancel:contribution:${contribution.id}`,
      narration: "Monthly record contribution cancellation",
      entries: [
        { ledgerAccountId: savingsAccount.id, direction: "debit", amount },
        { ledgerAccountId: cashAccount.id, direction: "credit", amount },
      ],
    },
    input.tx
  )

  await input.tx.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorType: "user",
      action: "contribution.reversed",
      entityType: "Contribution",
      entityId: contribution.id,
      metadata: { amount, source: "monthly_record.cancel" },
      occurredAt: new Date(),
    },
  })
}

async function unwindRepaymentSchedule(input: {
  amount: number
  loanId: string
  tenantId: string
  tx: PrismaClient
}) {
  let remaining = input.amount
  const scheduleItems = await input.tx.repaymentScheduleItem.findMany({
    where: {
      tenantId: input.tenantId,
      loanId: input.loanId,
      amountPaid: { gt: 0 },
    },
    orderBy: [{ installmentNumber: "desc" }],
  })

  for (const item of scheduleItems) {
    if (remaining <= 0) break

    const allocated = Math.min(Number(item.amountPaid), remaining)
    const nextPaid = Number(item.amountPaid) - allocated

    await input.tx.repaymentScheduleItem.update({
      where: { id: item.id },
      data: {
        amountPaid: nextPaid,
        status:
          nextPaid > 0
            ? "partially_paid"
            : item.dueAt < new Date()
              ? "overdue"
              : "pending",
      },
    })

    remaining -= allocated
  }
}

async function reverseMonthlyRepayment(input: {
  actorUserId: string
  repaymentId: string
  tenantId: string
  tx: PrismaClient
}) {
  const repayment = await input.tx.repayment.findFirst({
    where: {
      id: input.repaymentId,
      tenantId: input.tenantId,
    },
  })

  if (!repayment || repayment.status === "reversed") return

  const amount = Number(repayment.amount)
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
    throw new Error("Ledger accounts not initialized for this tenant")
  }

  await input.tx.repayment.update({
    where: { id: repayment.id },
    data: { status: "reversed" },
  })

  await input.tx.loan.update({
    where: { id: repayment.loanId },
    data: {
      closedAt: null,
      outstandingPrincipal: { increment: amount },
      status: "active",
    },
  })

  await unwindRepaymentSchedule({
    amount,
    loanId: repayment.loanId,
    tenantId: input.tenantId,
    tx: input.tx,
  })

  await postLedgerTransaction(
    {
      tenantId: input.tenantId,
      transactionType: "adjustment",
      postedAt: new Date(),
      memberId: repayment.memberId,
      loanId: repayment.loanId,
      reference: `monthly-record-cancel:repayment:${repayment.id}`,
      narration: "Monthly record repayment cancellation",
      entries: [
        {
          ledgerAccountId: loanReceivableAccount.id,
          direction: "debit",
          amount,
        },
        { ledgerAccountId: cashAccount.id, direction: "credit", amount },
      ],
    },
    input.tx
  )

  await input.tx.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorType: "user",
      action: "repayment.reversed",
      entityType: "Repayment",
      entityId: repayment.id,
      metadata: {
        amount,
        loanId: repayment.loanId,
        source: "monthly_record.cancel",
      },
      occurredAt: new Date(),
    },
  })
}

export async function cancelMonthlyRecordMember(
  input: {
    actorUserId: string
    monthlyRecordMemberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  return prisma.$transaction(async (tx) => {
    const row = await tx.monthlyRecordMember.findFirst({
      where: {
        id: input.monthlyRecordMemberId,
        tenantId: input.tenantId,
      },
      include: { monthlyRecord: true },
    })

    if (!row) throw new Error("Monthly record member row not found.")
    if (row.status === "cancelled")
      throw new Error("This monthly record row is already cancelled.")
    if (row.monthlyRecord.status === "closed") {
      throw new Error("Closed monthly records cannot be changed.")
    }

    if (row.status === "applied") {
      if (row.contributionId) {
        await reverseMonthlyContribution({
          actorUserId: input.actorUserId,
          contributionId: row.contributionId,
          tenantId: input.tenantId,
          tx: tx as unknown as PrismaClient,
        })
      }

      if (row.repaymentId) {
        await reverseMonthlyRepayment({
          actorUserId: input.actorUserId,
          repaymentId: row.repaymentId,
          tenantId: input.tenantId,
          tx: tx as unknown as PrismaClient,
        })
      }
    }

    const cancelled = await tx.monthlyRecordMember.update({
      where: { id: row.id },
      data: {
        cancelledAt: new Date(),
        status: "cancelled",
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "monthly_record_member.cancelled",
        entityType: "MonthlyRecordMember",
        entityId: row.id,
        metadata: {
          contributionId: row.contributionId,
          monthlyRecordId: row.monthlyRecordId,
          memberId: row.memberId,
          previousStatus: row.status,
          repaymentId: row.repaymentId,
        },
        occurredAt: new Date(),
      },
    })

    return cancelled
  })
}
