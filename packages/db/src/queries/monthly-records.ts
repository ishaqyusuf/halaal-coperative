import type { LoanStatus, Prisma, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError, QueryInfrastructureError } from "../query-error"
import {
  applyApplicableWorkflowChargesInTransaction,
  loadChargeQuoter,
  reverseChargeApplicationInTransaction,
  waiveChargeApplicationInTransaction,
} from "./charges"
import { refreshCollectionSourceBatchStatus } from "./collection-source-batches"
import { recordMemberPaymentMutation } from "./contributions"
import {
  findMembersPaidByWorkplaceBatch,
  lockMembersForMonthlyPayment,
} from "./monthly-payment-guard"
import { getLedgerAccountByCode, postLedgerTransaction } from "./ledger"
import { getTenantMigrationWriteAccess } from "./migration"

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
  const writeAccess = await getTenantMigrationWriteAccess(tenantId, prisma)

  if (!writeAccess.canUseLiveFinancialWrites) {
    throw ExpectedQueryError.precondition(
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
  workplaceId: string | null
  workplaceName: string | null
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

export type StagedMonthlyContributionRow = {
  contributionAmount: number
  id: string
  loanRepaymentAmount: number
  memberId: string
  memberName: string
  memberNumber: string
  periodLabel: string
  shareChargeAmount: number
  status: "staged"
  totalPayableAmount: number
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
    throw ExpectedQueryError.validation("Enter a valid record year.")
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw ExpectedQueryError.validation("Enter a valid record month.")
  }
}

function clampGenerationDay(day: number) {
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    throw ExpectedQueryError.validation(
      "Monthly record generation day must be between 1 and 28."
    )
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

// Read-only: a missing row means the defaults. Only
// `updateMonthlyRecordSettings` writes the settings row.
export async function getMonthlyRecordSettings(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<MonthlyRecordSettingView> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const row = await prisma.monthlyRecordSetting.findUnique({
    where: { tenantId },
    select: { autoGenerateEnabled: true, generationDayOfMonth: true },
  })

  return settingView(
    row ?? {
      autoGenerateEnabled: true,
      generationDayOfMonth: defaultGenerationDayOfMonth,
    }
  )
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

// Two queries whatever the number of months or members: the month rows, and
// one grouped aggregate of their member rows.
export async function listMonthlyRecords(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<MonthlyRecordSummary[]> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [records, groups] = await Promise.all([
    prisma.monthlyRecord.findMany({
      where: { tenantId },
      select: {
        id: true,
        periodLabel: true,
        periodMonth: true,
        periodYear: true,
        status: true,
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    }),
    prisma.monthlyRecordMember.groupBy({
      by: ["monthlyRecordId", "status"],
      where: { tenantId },
      _count: { _all: true },
      _sum: { calculatedPayableAmount: true, totalPaidAmount: true },
    }),
  ])
  const groupsByRecordId = new Map<string, typeof groups>()
  for (const group of groups) {
    const recordGroups = groupsByRecordId.get(group.monthlyRecordId) ?? []
    recordGroups.push(group)
    groupsByRecordId.set(group.monthlyRecordId, recordGroups)
  }

  return records.map((record) => {
    const recordGroups = groupsByRecordId.get(record.id) ?? []
    const countOf = (status: MonthlyRecordMemberStatusValue) =>
      recordGroups.find((group) => group.status === status)?._count._all ?? 0
    const applied = recordGroups.find((group) => group.status === "applied")

    return {
      id: record.id,
      periodYear: record.periodYear,
      periodMonth: record.periodMonth,
      periodLabel: record.periodLabel,
      status: record.status as MonthlyRecordStatusValue,
      recordedCount: countOf("applied"),
      pendingCount: countOf("pending"),
      cancelledCount: countOf("cancelled"),
      totalMembers: recordGroups.reduce(
        (total, group) => total + group._count._all,
        0
      ),
      totalPayableAmount: recordGroups.reduce(
        (total, group) =>
          total + Number(group._sum.calculatedPayableAmount ?? 0),
        0
      ),
      totalReceivedAmount: Number(applied?._sum.totalPaidAmount ?? 0),
    }
  })
}

// Writes. Callers must have checked that live financial writes are open.
// Creates the missing member rows in one batch and refreshes only the pending
// rows whose calculated amounts changed; applied and cancelled rows are never
// touched.
async function seedMonthlyRecordMembers(input: {
  memberIds?: string[]
  monthlyRecordId: string
  tenantId: string
  year: number
  month: number
  prisma: PrismaClient
}) {
  const { end, start } = getPeriodRange(input.year, input.month)
  const memberFilter = input.memberIds ? { in: input.memberIds } : undefined
  const [members, shareChargeDefinition, existingRows] = await Promise.all([
    input.prisma.member.findMany({
      where: {
        tenantId: input.tenantId,
        status: { not: "exited" },
        ...(memberFilter ? { id: memberFilter } : {}),
      },
      include: {
        contributionPlans: {
          where: {
            interval: "monthly",
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
    }),
    input.prisma.chargeDefinition.findFirst({
      where: {
        tenantId: input.tenantId,
        appliesToMembers: true,
        isActive: true,
        purpose: "member_share",
      } as any,
      orderBy: [{ isMonthlyLevy: "desc" }, { createdAt: "asc" }],
    }),
    input.prisma.monthlyRecordMember.findMany({
      where: {
        monthlyRecordId: input.monthlyRecordId,
        ...(memberFilter ? { memberId: memberFilter } : {}),
      },
      select: {
        calculatedPayableAmount: true,
        contributionAmount: true,
        contributionPlanId: true,
        id: true,
        loanId: true,
        loanRepaymentAmount: true,
        memberId: true,
        shareChargeAmount: true,
        status: true,
        totalPaidAmount: true,
      },
    }),
  ])
  const shareChargeAmount = shareChargeDefinition
    ? Number(shareChargeDefinition.amount)
    : 0
  const existingByMemberId = new Map(
    existingRows.map((row) => [row.memberId, row])
  )
  const missingRows = []
  const changedPendingRows = []

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
    const values = {
      contributionPlanId: plan?.id ?? null,
      loanId: loan?.id ?? null,
      calculatedPayableAmount,
      contributionAmount,
      shareChargeAmount,
      loanRepaymentAmount: loanPayable,
      totalPaidAmount: calculatedPayableAmount,
    }
    const existingRow = existingByMemberId.get(member.id)

    if (!existingRow) {
      missingRows.push({
        ...values,
        memberId: member.id,
        monthlyRecordId: input.monthlyRecordId,
        tenantId: input.tenantId,
      })
      continue
    }

    const changed =
      existingRow.contributionPlanId !== values.contributionPlanId ||
      existingRow.loanId !== values.loanId ||
      Number(existingRow.calculatedPayableAmount) !==
        values.calculatedPayableAmount ||
      Number(existingRow.contributionAmount) !== values.contributionAmount ||
      Number(existingRow.shareChargeAmount) !== values.shareChargeAmount ||
      Number(existingRow.loanRepaymentAmount) !== values.loanRepaymentAmount ||
      Number(existingRow.totalPaidAmount) !== values.totalPaidAmount

    if (existingRow.status === "pending" && changed) {
      changedPendingRows.push({ id: existingRow.id, values })
    }
  }

  if (missingRows.length > 0) {
    await input.prisma.monthlyRecordMember.createMany({
      data: missingRows,
      skipDuplicates: true,
    })
  }

  if (changedPendingRows.length > 0) {
    // `status: "pending"` keeps a row that was applied meanwhile untouched.
    await input.prisma.$transaction(
      changedPendingRows.map((row) =>
        input.prisma.monthlyRecordMember.updateMany({
          where: { id: row.id, status: "pending" },
          data: row.values,
        })
      )
    )
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

  const writeAccess = await getTenantMigrationWriteAccess(
    input.tenantId,
    prisma
  )
  if (!writeAccess.canUseLiveFinancialWrites) {
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
    memberIds: [input.memberId],
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
  if (tenants.length === 0) return { generated, skipped: [] }

  // One read for every tenant's settings instead of a per-tenant upsert: the
  // scheduled run must not write default rows or issue N queries just to
  // learn that nothing is due.
  const settingRows = await prisma.monthlyRecordSetting.findMany({
    where: { tenantId: { in: tenants.map((tenant) => tenant.id) } },
    select: {
      autoGenerateEnabled: true,
      generationDayOfMonth: true,
      tenantId: true,
    },
  })
  const { due, skipped } = selectDueMonthlyRecordTenants({
    dayOfMonth,
    settings: settingRows,
    tenantIds: tenants.map((tenant) => tenant.id),
  })

  for (const tenantId of due) {
    const record = await ensureMonthlyRecord(
      {
        actorUserId: input.actorUserId,
        month: now.getUTCMonth() + 1,
        tenantId,
        year: now.getUTCFullYear(),
      },
      prisma
    )

    generated.push({ monthlyRecordId: record.id, tenantId })
  }

  return { generated, skipped }
}

// Missing settings rows mean the defaults `getMonthlyRecordSettings` reports:
// auto-generation on, from day `defaultGenerationDayOfMonth`.
export function selectDueMonthlyRecordTenants(input: {
  dayOfMonth: number
  settings: Array<{
    autoGenerateEnabled: boolean
    generationDayOfMonth: number
    tenantId: string
  }>
  tenantIds: string[]
}) {
  const settingsByTenant = new Map(
    input.settings.map((setting) => [setting.tenantId, setting])
  )
  const due: string[] = []
  const skipped: Array<{ reason: string; tenantId: string }> = []

  for (const tenantId of input.tenantIds) {
    const settings = settingsByTenant.get(tenantId) ?? {
      autoGenerateEnabled: true,
      generationDayOfMonth: defaultGenerationDayOfMonth,
    }
    if (!settings.autoGenerateEnabled) {
      skipped.push({ reason: "disabled", tenantId })
      continue
    }

    if (input.dayOfMonth < settings.generationDayOfMonth) {
      skipped.push({ reason: "not_due", tenantId })
      continue
    }

    due.push(tenantId)
  }

  return { due, skipped }
}

export async function listCurrentMonthStagedContributions(
  tenantId: string,
  input?: {
    now?: Date
  },
  prismaOverride?: PrismaClient
): Promise<StagedMonthlyContributionRow[]> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const now = input?.now ?? new Date()
  const record = await prisma.monthlyRecord.findUnique({
    where: {
      tenantId_periodYear_periodMonth: {
        tenantId,
        periodMonth: now.getUTCMonth() + 1,
        periodYear: now.getUTCFullYear(),
      },
    },
    include: {
      memberRows: {
        where: {
          status: "pending",
        },
        include: {
          member: {
            select: {
              fullName: true,
              id: true,
              memberNumber: true,
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

  if (!record || record.status === "closed") {
    return []
  }

  return record.memberRows.map((row) => ({
    contributionAmount: Number(row.contributionAmount),
    id: row.id,
    loanRepaymentAmount: Number(row.loanRepaymentAmount),
    memberId: row.member.id,
    memberName: row.member.fullName,
    memberNumber: row.member.memberNumber,
    periodLabel: record.periodLabel,
    shareChargeAmount: Number((row as any).shareChargeAmount ?? 0),
    status: "staged",
    totalPayableAmount: Number(row.calculatedPayableAmount),
  }))
}

// Read-only, and a constant number of queries whatever the member count.
// Rows are seeded by `ensureMonthlyRecord` (the create action or the cron).
const monthlyRecordRowOrder = [
  { member: { memberNumber: "asc" } },
  { member: { fullName: "asc" } }
] satisfies Prisma.MonthlyRecordMemberOrderByWithRelationInput[]

const monthlyRecordRowSelect = {
  calculatedPayableAmount: true,
  contributionAmount: true,
  id: true,
  loanId: true,
  loanRepaymentAmount: true,
  memberId: true,
  shareChargeAmount: true,
  status: true,
  totalPaidAmount: true,
  member: {
    select: {
      deductionSource: { select: { id: true, name: true } },
      fullName: true,
      memberNumber: true,
      totalSavingsSnapshot: true
    }
  }
} satisfies Prisma.MonthlyRecordMemberSelect

type MonthlyRecordReadRow = Prisma.MonthlyRecordMemberGetPayload<{
  select: typeof monthlyRecordRowSelect
}>

type MonthlyRecordPeriod = Pick<
  MonthlyRecordSummary,
  "periodYear" | "periodMonth"
>

function readMonthlyRecord(
  tenantId: string,
  monthlyRecordId: string,
  prisma: PrismaClient
) {
  return prisma.monthlyRecord.findFirst({
    where: { id: monthlyRecordId, tenantId },
    select: {
      id: true,
      periodYear: true,
      periodMonth: true,
      periodLabel: true,
      status: true,
      memberRows: {
        select: monthlyRecordRowSelect,
        orderBy: monthlyRecordRowOrder
      }
    }
  })
}

function toBaseMonthlyRecordRow(row: MonthlyRecordReadRow) {
  return {
    id: row.id,
    memberId: row.memberId,
    memberNumber: row.member.memberNumber,
    memberName: row.member.fullName,
    currentBalance: Number(row.member.totalSavingsSnapshot),
    contributionAmount: Number(row.contributionAmount),
    loanRepaymentAmount: Number(row.loanRepaymentAmount),
    shareChargeAmount: Number(row.shareChargeAmount ?? 0),
    totalPayableAmount: Number(row.calculatedPayableAmount),
    totalPaidAmount: Number(row.totalPaidAmount),
    status: row.status,
    workplaceId: row.member.deductionSource?.id ?? null,
    workplaceName: row.member.deductionSource?.name ?? null
  }
}

type BaseMonthlyRecordRow = ReturnType<typeof toBaseMonthlyRecordRow>

async function loadMonthlyRecordRowDetails(
  tenantId: string,
  period: MonthlyRecordPeriod,
  rows: MonthlyRecordReadRow[],
  prisma: PrismaClient
) {
  const { end, start } = getPeriodRange(period.periodYear, period.periodMonth)
  const loanIds = rows
    .map((row) => row.loanId)
    .filter((loanId): loanId is string => Boolean(loanId))
  const memberIds = rows.map((row) => row.memberId)
  const loanLookupWhere =
    loanIds.length > 0
      ? {
          tenantId,
          OR: [
            { id: { in: loanIds } },
            {
              memberId: { in: memberIds },
              outstandingPrincipal: { gt: 0 },
              status: { in: activeMonthlyRecordLoanStatuses }
            }
          ]
        }
      : {
          memberId: { in: memberIds },
          outstandingPrincipal: { gt: 0 },
          status: { in: activeMonthlyRecordLoanStatuses },
          tenantId
        }
  const [loans, quoteCharges, appliedCharges] = memberIds.length
    ? await Promise.all([
        prisma.loan.findMany({
          where: loanLookupWhere,
          select: { id: true, memberId: true, status: true },
          orderBy: [{ disbursedAt: "desc" }, { createdAt: "desc" }]
        }),
        loadChargeQuoter(
          {
            assessedAt: start,
            tenantId,
            trigger: "monthly_collection",
            workflow: "commitment_collection"
          },
          prisma
        ),
        prisma.chargeApplication.findMany({
          where: {
            tenantId,
            memberId: { in: memberIds },
            status: "posted",
            assessedAt: { gte: start, lt: end }
          },
          select: {
            amount: true,
            chargeDefinitionId: true,
            memberId: true
          }
        })
      ])
    : [[], () => [], []]
  const loanStatusById = new Map(loans.map((loan) => [loan.id, loan.status]))
  const activeLoanByMemberId = new Map<string, (typeof loans)[number]>()
  for (const loan of loans) {
    if (!activeLoanByMemberId.has(loan.memberId)) {
      activeLoanByMemberId.set(loan.memberId, loan)
    }
  }
  const actualChargesByMemberId = new Map<string, number>()
  for (const charge of appliedCharges) {
    actualChargesByMemberId.set(
      charge.memberId,
      (actualChargesByMemberId.get(charge.memberId) ?? 0) +
        Number(charge.amount)
    )
  }

  const quotesByMemberId = new Map(
    rows.map((row) => [row.memberId, quoteCharges(Number(row.totalPaidAmount))])
  )
  return {
    appliedCharges,
    quotesByMemberId,
    rows: rows.map((row): MonthlyRecordMemberRow => {
      const base = toBaseMonthlyRecordRow(row)
      const actualChargesAmount =
        actualChargesByMemberId.get(base.memberId) ?? 0
      const calculatedChargesAmount =
        quotesByMemberId
          .get(base.memberId)
          ?.reduce((total, charge) => total + charge.amount, 0) ?? 0
      const isApplied = base.status === "applied"
      const actualFinalIncomeAmount = base.totalPaidAmount - actualChargesAmount
      const calculatedFinalIncomeAmount =
        base.totalPaidAmount - calculatedChargesAmount
      const loanStatus = row.loanId
        ? (loanStatusById.get(row.loanId) ?? "active")
        : activeLoanByMemberId.get(base.memberId)?.status

      return {
        ...base,
        actualChargesAmount,
        calculatedChargesAmount,
        allChargesAmount: isApplied
          ? actualChargesAmount
          : calculatedChargesAmount,
        actualFinalIncomeAmount,
        calculatedFinalIncomeAmount,
        finalIncomeAmount: isApplied
          ? actualFinalIncomeAmount
          : calculatedFinalIncomeAmount,
        hasChargeDifference:
          isApplied &&
          Math.abs(actualChargesAmount - calculatedChargesAmount) > 0.009,
        hasFinalIncomeDifference:
          isApplied &&
          Math.abs(actualFinalIncomeAmount - calculatedFinalIncomeAmount) >
            0.009,
        loanStatus: loanStatus ?? "none"
      }
    })
  }
}

export async function getMonthlyRecordDetail(
  tenantId: string,
  monthlyRecordId: string,
  prismaOverride?: PrismaClient
): Promise<MonthlyRecordDetail | null> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const record = await readMonthlyRecord(tenantId, monthlyRecordId, prisma)
  if (!record) return null

  const { appliedCharges, quotesByMemberId, rows } =
    await loadMonthlyRecordRowDetails(
      tenantId,
      record,
      record.memberRows,
      prisma
    )
  const calculatedChargesByDefinitionId = new Map<
    string,
    {
      amount: number
      code: string
      kind: "fixed" | "percentage"
      name: string
      totalAmount: number
    }
  >()

  for (const quotes of quotesByMemberId.values()) {
    for (const quote of quotes) {
      const existing = calculatedChargesByDefinitionId.get(
        quote.chargeDefinitionId
      )
      calculatedChargesByDefinitionId.set(quote.chargeDefinitionId, {
        amount: quote.effectiveAmount,
        code: quote.code,
        kind: quote.chargeValueType === "percentage" ? "percentage" : "fixed",
        name: quote.name,
        totalAmount: (existing?.totalAmount ?? 0) + quote.amount
      })
    }
  }
  const actualChargesByDefinitionId = new Map<string, number>()

  for (const charge of appliedCharges) {
    actualChargesByDefinitionId.set(
      charge.chargeDefinitionId,
      (actualChargesByDefinitionId.get(charge.chargeDefinitionId) ?? 0) +
        Number(charge.amount)
    )
  }

  const chargeBreakdown = [...calculatedChargesByDefinitionId.entries()].map(
    ([chargeDefinitionId, charge]) => {
      const appliedTotalAmount =
        actualChargesByDefinitionId.get(chargeDefinitionId) ?? 0

      return {
        id: chargeDefinitionId,
        name: charge.name,
        code: charge.code,
        kind: charge.kind,
        amount: charge.amount,
        appliedTotalAmount,
        hasDifference:
          Math.abs(appliedTotalAmount - charge.totalAmount) > 0.009,
        memberCount: record.memberRows.length,
        totalAmount: charge.totalAmount
      }
    }
  )
  return {
    ...summarizeRows(record),
    chargeBreakdown,
    totalChargeAmount: chargeBreakdown.reduce(
      (sum, charge) => sum + charge.totalAmount,
      0
    ),
    rows
  }
}

export type MonthlyRecordCollectionStats = {
  paidCount: number
  received: number
  toReceive: number
  total: number
}

export type MonthlyRecordWorkplace = {
  id: string
  name: string
  unpaidCount: number
  stats: MonthlyRecordCollectionStats
}

function getMonthlyRecordCollectionSummary(rows: BaseMonthlyRecordRow[]) {
  const stats: MonthlyRecordCollectionStats = {
    paidCount: 0,
    received: 0,
    toReceive: 0,
    total: 0
  }
  const workplaces = new Map<string, MonthlyRecordWorkplace>()

  function addRow(
    target: MonthlyRecordCollectionStats,
    row: BaseMonthlyRecordRow
  ) {
    target.total += 1
    if (row.status === "applied") {
      target.paidCount += 1
      target.received += row.totalPaidAmount
    }
    if (row.status === "pending") target.toReceive += row.totalPayableAmount
  }

  for (const row of rows) {
    addRow(stats, row)
    if (!row.workplaceId) continue

    let workplace = workplaces.get(row.workplaceId)
    if (!workplace) {
      workplace = {
        id: row.workplaceId,
        name: row.workplaceName ?? "",
        unpaidCount: 0,
        stats: { paidCount: 0, received: 0, toReceive: 0, total: 0 }
      }
      workplaces.set(row.workplaceId, workplace)
    }
    addRow(workplace.stats, row)
    if (row.status === "pending" && row.totalPayableAmount > 0) {
      workplace.unpaidCount += 1
    }
  }

  return {
    stats,
    workplaces: [...workplaces.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }
}

export type MonthlyRecordWorkspaceSummary = MonthlyRecordPeriod &
  ReturnType<typeof getMonthlyRecordCollectionSummary> & {
    id: string
    periodLabel: string
  }

// A GET never creates a month or seeds rows. Reuse the base read for both the
// whole-month summary and the table's hydrated first page.
export async function getMonthlyRecordsPageData(
  input: {
    rowsQuery?: MonthlyRecordRowsQuery
    selectedRecordId?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [records, settings] = await Promise.all([
    listMonthlyRecords(input.tenantId, prisma),
    getMonthlyRecordSettings(input.tenantId, prisma)
  ])
  const requestedRecord =
    records.find((record) => record.id === input.selectedRecordId) ?? records[0]
  const record = requestedRecord
    ? await readMonthlyRecord(input.tenantId, requestedRecord.id, prisma)
    : null
  if (!record) {
    return {
      firstPage: pageMonthlyRecordRows([]),
      records,
      selectedRecord: null,
      settings
    }
  }

  const { id, periodLabel, periodMonth, periodYear } = record
  const baseRows = record.memberRows.map(withMonthlyRecordRowSource)
  const selectedRecord: MonthlyRecordWorkspaceSummary = {
    id,
    periodLabel,
    periodMonth,
    periodYear,
    ...getMonthlyRecordCollectionSummary(baseRows)
  }
  const firstPage = await readMonthlyRecordRowsPage(
    input.tenantId,
    record,
    baseRows,
    input.rowsQuery ?? {},
    prisma
  )

  return { firstPage, records, selectedRecord, settings }
}

export type MonthlyRecordRowSortField =
  | "allChargesAmount"
  | "contributionAmount"
  | "currentBalance"
  | "finalIncomeAmount"
  | "loanRepaymentAmount"
  | "loanStatus"
  | "memberName"
  | "shareChargeAmount"
  | "status"
  | "totalPaidAmount"
  | "totalPayableAmount"
  | "workplaceName"

export type MonthlyRecordRowsQuery = {
  cursor?: string | null
  pageSize?: number
  q?: string | null
  sort?: [MonthlyRecordRowSortField, "asc" | "desc"] | null
  status?: MonthlyRecordMemberStatusValue | null
  workplaceId?: string | null
}

export function pageMonthlyRecordRows(
  rows: MonthlyRecordMemberRow[],
  input: MonthlyRecordRowsQuery = {}
) {
  return pageRowsByField(rows, input, input.sort)
}

function pageRowsByField<Row extends BaseMonthlyRecordRow>(
  rows: Row[],
  input: MonthlyRecordRowsQuery,
  sort?: readonly [keyof Row, "asc" | "desc"] | null
) {
  const pageSize = input.pageSize ?? 50
  const query = input.q?.trim().toLowerCase()
  const filtered = rows.filter(
    (row) =>
      (!input.status || row.status === input.status) &&
      (!input.workplaceId || row.workplaceId === input.workplaceId) &&
      (!query ||
        row.memberName.toLowerCase().includes(query) ||
        row.memberNumber.toLowerCase().includes(query))
  )
  const sorted = sort ? sortMonthlyRecordRows(filtered, sort) : filtered
  const startIndex = input.cursor
    ? sorted.findIndex((row) => row.id === input.cursor) + 1
    : 0
  const safeStartIndex = startIndex > 0 ? startIndex : 0
  const pageRows = sorted.slice(safeStartIndex, safeStartIndex + pageSize + 1)
  const data = pageRows.slice(0, pageSize)

  return {
    data,
    meta: {
      cursor: pageRows.length > pageSize ? data.at(-1)?.id : undefined,
      total: sorted.length
    }
  }
}

function sortMonthlyRecordRows<Row>(
  rows: Row[],
  [field, direction]: readonly [keyof Row, "asc" | "desc"]
) {
  const factor = direction === "asc" ? 1 : -1

  return [...rows].sort((left, right) => {
    const leftValue = left[field]
    const rightValue = right[field]

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor
    }

    return (
      String(leftValue ?? "").localeCompare(String(rightValue ?? "")) * factor
    )
  })
}

function withMonthlyRecordRowSource(source: MonthlyRecordReadRow) {
  return { ...toBaseMonthlyRecordRow(source), source }
}

async function readMonthlyRecordRowsPage(
  tenantId: string,
  record: MonthlyRecordPeriod & { memberRows: MonthlyRecordReadRow[] },
  baseRows: ReturnType<typeof withMonthlyRecordRowSource>[],
  input: MonthlyRecordRowsQuery,
  prisma: PrismaClient
) {
  const field = input.sort?.[0]
  // These columns need live charge or loan data to compare candidates, so
  // compute their original values before selecting the cursor page.
  if (
    field === "allChargesAmount" ||
    field === "finalIncomeAmount" ||
    field === "loanStatus"
  ) {
    const { rows } = await loadMonthlyRecordRowDetails(
      tenantId,
      record,
      record.memberRows,
      prisma
    )
    return pageMonthlyRecordRows(rows, input)
  }

  const sort = field && input.sort ? ([field, input.sort[1]] as const) : null
  const page = pageRowsByField(baseRows, input, sort)
  const pageRows = page.data.map((row) => row.source)
  const { rows } = await loadMonthlyRecordRowDetails(
    tenantId,
    record,
    pageRows,
    prisma
  )

  return { data: rows, meta: page.meta }
}

export async function getMonthlyRecordRowsPage(
  tenantId: string,
  monthlyRecordId: string,
  input: MonthlyRecordRowsQuery,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const record = await readMonthlyRecord(tenantId, monthlyRecordId, prisma)
  return record
    ? readMonthlyRecordRowsPage(
        tenantId,
        record,
        record.memberRows.map(withMonthlyRecordRowSource),
        input,
        prisma
      )
    : pageMonthlyRecordRows([])
}

export type MonthlyRecordActionRow = Pick<
  MonthlyRecordMemberRow,
  | "id"
  | "memberName"
  | "memberNumber"
  | "status"
  | "totalPaidAmount"
  | "totalPayableAmount"
>

export async function getMonthlyRecordActionRows(
  tenantId: string,
  monthlyRecordId: string,
  scope: { rowId: string } | { workplaceId: string },
  prismaOverride?: PrismaClient
): Promise<MonthlyRecordActionRow[]> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const rows = await prisma.monthlyRecordMember.findMany({
    where: {
      tenantId,
      monthlyRecord: { id: monthlyRecordId, tenantId },
      ...("rowId" in scope
        ? { id: scope.rowId }
        : { member: { deductionSourceId: scope.workplaceId } })
    },
    orderBy: monthlyRecordRowOrder,
    select: {
      id: true,
      calculatedPayableAmount: true,
      status: true,
      totalPaidAmount: true,
      member: { select: { fullName: true, memberNumber: true } }
    }
  })

  return rows.map((row) => ({
    id: row.id,
    memberName: row.member.fullName,
    memberNumber: row.member.memberNumber,
    status: row.status,
    totalPaidAmount: Number(row.totalPaidAmount),
    totalPayableAmount: Number(row.calculatedPayableAmount)
  }))
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
    throw ExpectedQueryError.validation(
      "Enter a payment amount greater than zero."
    )
  }
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  // The claim, payment, charges and row update commit together, so a failed
  // charge cannot leave a posted payment behind an unapplied row.
  return prisma.$transaction(
    async (transaction) => {
      const tx = transaction as unknown as PrismaClient
      const row = await tx.monthlyRecordMember.findFirst({
        where: {
          id: input.monthlyRecordMemberId,
          tenantId: input.tenantId,
        },
        include: {
          monthlyRecord: true,
        },
      })

      if (!row) {
        throw ExpectedQueryError.notFound(
          "Monthly record member row not found."
        )
      }
      if (row.status === "applied")
        throw ExpectedQueryError.conflict(
          "This monthly record row has already been applied."
        )
      if (row.monthlyRecord.status === "closed")
        throw ExpectedQueryError.conflict(
          "Closed monthly records cannot be changed."
        )

      // Lock the member before the row claim (the same order every monthly
      // payment path uses), then refuse a member already paid for this month
      // through a workplace batch on the contributions page.
      await lockMembersForMonthlyPayment(tx, {
        memberIds: [row.memberId],
        tenantId: input.tenantId,
      })
      const batchPaid = await findMembersPaidByWorkplaceBatch(tx, {
        memberIds: [row.memberId],
        periodMonth: row.monthlyRecord.periodMonth,
        periodYear: row.monthlyRecord.periodYear,
        tenantId: input.tenantId,
      })
      if (batchPaid.has(row.memberId)) {
        throw ExpectedQueryError.conflict(
          `This member was already paid for ${row.monthlyRecord.periodLabel} through a workplace batch.`
        )
      }

      // Claim the row first so a concurrent apply of the same row waits on
      // this row lock and then fails instead of posting a second payment.
      const claimed = await tx.monthlyRecordMember.updateMany({
        data: { status: "applied" },
        where: {
          id: row.id,
          status: { in: ["pending", "cancelled"] },
          tenantId: input.tenantId,
        },
      })

      if (claimed.count !== 1) {
        throw ExpectedQueryError.conflict(
          "This monthly record row has already been applied."
        )
      }

      const member = await tx.member.findFirst({
        where: {
          id: row.memberId,
          tenantId: input.tenantId,
        },
        select: {
          deductionSourceId: true,
          paymentAllocationPreference: true,
        },
      })

      if (!member) throw ExpectedQueryError.notFound("Member not found.")

      const applied = await postClaimedMonthlyRecordRow(
        {
          actorUserId: input.actorUserId,
          channel: "manual",
          paymentAllocationPreference: member.paymentAllocationPreference,
          row,
          tenantId: input.tenantId,
          totalPaidAmount: input.totalPaidAmount,
        },
        tx
      )

      // Like workplace receiving, record the payment on the member's
      // workplace batch for the month, so the contributions page shows it.
      if (member.deductionSourceId) {
        await recordWorkplaceBatchPostings(
          {
            actorUserId: input.actorUserId,
            postedAt: getPeriodRange(
              row.monthlyRecord.periodYear,
              row.monthlyRecord.periodMonth
            ).start,
            postings: [
              {
                contributionId: applied.contributionId,
                contributionPlanId: row.contributionPlanId,
                expectedAmount: Number(row.calculatedPayableAmount),
                memberId: row.memberId,
                paidAmount: input.totalPaidAmount,
              },
            ],
            record: row.monthlyRecord,
            tenantId: input.tenantId,
            workplaceId: member.deductionSourceId,
          },
          tx
        )
      }

      return applied
    },
    {
      maxWait: 5_000,
      timeout: 15_000,
    }
  )
}

type ClaimedMonthlyRecordRow = {
  contributionAmount: unknown
  contributionPlanId: string | null
  id: string
  loanId: string | null
  loanRepaymentAmount: unknown
  memberId: string
  monthlyRecord: {
    id: string
    periodLabel: string
    periodMonth: number
    periodYear: number
  }
}

// Posts the payment, the commitment-collection charges and the row link for a
// row the caller has already claimed (`status: "applied"`) in `tx`. Shared by
// the single apply and workplace receiving, so both post the same way.
async function postClaimedMonthlyRecordRow(
  input: {
    actorUserId: string
    channel: "manual" | "payroll"
    paymentAllocationPreference?: string | null
    row: ClaimedMonthlyRecordRow
    tenantId: string
    totalPaidAmount: number
  },
  tx: PrismaClient
) {
  const { row } = input
  const {
    contributionAmount,
    extraSavingsAmount,
    scheduledLoanServicingAmount,
  } = allocateMonthlyRecordPayment({
    contributionTarget: Number(row.contributionAmount),
    loanTarget: Number(row.loanRepaymentAmount),
    paymentAllocationPreference: input.paymentAllocationPreference ?? undefined,
    totalPaidAmount: input.totalPaidAmount,
  })
  const assessedAt = getPeriodRange(
    row.monthlyRecord.periodYear,
    row.monthlyRecord.periodMonth
  ).start

  const posted = await recordMemberPaymentMutation(
    {
      actorUserId: input.actorUserId,
      channel: input.channel,
      committedSavingsAmount: contributionAmount,
      contributionPlanId: row.contributionPlanId ?? undefined,
      extraSavingsAmount,
      loanId:
        scheduledLoanServicingAmount > 0
          ? (row.loanId ?? undefined)
          : undefined,
      memberId: row.memberId,
      periodLabel: row.monthlyRecord.periodLabel,
      postedAt: assessedAt,
      reference: `monthly-record:${row.monthlyRecord.id}:${row.id}`,
      scheduledLoanServicingAmount,
      tenantId: input.tenantId,
    },
    tx
  )

  await applyApplicableWorkflowChargesInTransaction(
    {
      actorUserId: input.actorUserId,
      assessedAt,
      basisAmount: input.totalPaidAmount,
      memberId: row.memberId,
      monthlyRecordMemberId: row.id,
      notes: `Posted from monthly record ${row.monthlyRecord.periodLabel}`,
      tenantId: input.tenantId,
      trigger: "monthly_collection",
      workflow: "commitment_collection",
    },
    tx
  )

  return tx.monthlyRecordMember.update({
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

export const workplaceReceiveMaxRows = 500
const workplaceReceiveChunkSize = 20

export type WorkplaceReceiveSkipReason =
  | "already_paid"
  | "cancelled"
  | "not_found"
  | "not_in_workplace"
  | "nothing_due"
  | "paid_by_workplace_batch"

export type WorkplaceReceiveResult = {
  batchId: string | null
  periodLabel: string
  receivedAmount: number
  receivedCount: number
  received: Array<{ amount: number; memberId: string; rowId: string }>
  skipped: Array<{ reason: WorkplaceReceiveSkipReason; rowId: string }>
  workplaceName: string
}

// Marks the chosen members of one workplace as paid for one month. Each row
// goes through the same claim and posting as a single apply, so re-running is
// safe: rows already applied (or paid through a workplace batch on the
// contributions page) are skipped, never posted twice. Rows are posted in
// bounded transactions; every committed chunk is also recorded against the
// workplace's `CollectionSourceContributionBatch` for that month.
export async function receiveWorkplaceMonthlyPayments(
  input: {
    actorUserId: string
    monthlyRecordId: string
    rowIds: string[]
    tenantId: string
    workplaceId: string
  },
  prismaOverride?: PrismaClient
): Promise<WorkplaceReceiveResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const rowIds = [...new Set(input.rowIds)]
  if (rowIds.length === 0) {
    throw ExpectedQueryError.validation("Choose at least one member.")
  }
  if (rowIds.length > workplaceReceiveMaxRows) {
    throw ExpectedQueryError.validation(
      `Choose at most ${workplaceReceiveMaxRows} members at a time.`
    )
  }
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const [record, workplace] = await Promise.all([
    prisma.monthlyRecord.findFirst({
      where: { id: input.monthlyRecordId, tenantId: input.tenantId },
      select: {
        id: true,
        periodLabel: true,
        periodMonth: true,
        periodYear: true,
        status: true,
      },
    }),
    prisma.deductionSource.findFirst({
      where: { id: input.workplaceId, tenantId: input.tenantId },
      select: { id: true, name: true },
    }),
  ])

  if (!record) throw ExpectedQueryError.notFound("Monthly record not found.")
  if (record.status === "closed") {
    throw ExpectedQueryError.conflict(
      "Closed monthly records cannot be changed."
    )
  }
  if (!workplace) throw ExpectedQueryError.notFound("Workplace not found.")

  const rows = await prisma.monthlyRecordMember.findMany({
    where: {
      id: { in: rowIds },
      monthlyRecordId: record.id,
      tenantId: input.tenantId,
    },
    select: {
      calculatedPayableAmount: true,
      contributionAmount: true,
      contributionPlanId: true,
      id: true,
      loanId: true,
      loanRepaymentAmount: true,
      memberId: true,
      status: true,
      member: {
        select: { deductionSourceId: true, paymentAllocationPreference: true },
      },
    },
  })
  const rowsById = new Map(rows.map((row) => [row.id, row]))
  const skipped: WorkplaceReceiveResult["skipped"] = []
  const toReceive: typeof rows = []

  for (const rowId of rowIds) {
    const row = rowsById.get(rowId)
    const reason: WorkplaceReceiveSkipReason | null = !row
      ? "not_found"
      : row.member.deductionSourceId !== workplace.id
        ? "not_in_workplace"
        : row.status === "applied"
          ? "already_paid"
          : row.status === "cancelled"
            ? "cancelled"
            : Number(row.calculatedPayableAmount) <= 0
              ? "nothing_due"
              : null

    if (reason || !row) {
      skipped.push({ reason: reason ?? "not_found", rowId })
    } else {
      toReceive.push(row)
    }
  }

  const received: WorkplaceReceiveResult["received"] = []
  let batchId: string | null = null
  const monthlyRecord = {
    id: record.id,
    periodLabel: record.periodLabel,
    periodMonth: record.periodMonth,
    periodYear: record.periodYear,
  }
  const postedAt = getPeriodRange(record.periodYear, record.periodMonth).start

  for (
    let index = 0;
    index < toReceive.length;
    index += workplaceReceiveChunkSize
  ) {
    const chunk = toReceive.slice(index, index + workplaceReceiveChunkSize)

    await prisma.$transaction(
      async (transaction) => {
        const tx = transaction as unknown as PrismaClient
        const chunkReceived: typeof received = []
        const chunkPostings: Array<{
          amount: number
          contributionId: string | null
          contributionPlanId: string | null
          memberId: string
        }> = []

        // Lock the chunk's members, then skip anyone already paid for this
        // month through a workplace batch on the contributions page. Checked
        // here, inside the posting transaction, so a batch post committed a
        // moment ago is seen.
        const chunkMemberIds = chunk.map((row) => row.memberId)
        await lockMembersForMonthlyPayment(tx, {
          memberIds: chunkMemberIds,
          tenantId: input.tenantId,
        })
        const batchPaid = await findMembersPaidByWorkplaceBatch(tx, {
          memberIds: chunkMemberIds,
          periodMonth: record.periodMonth,
          periodYear: record.periodYear,
          tenantId: input.tenantId,
        })

        for (const row of chunk) {
          if (batchPaid.has(row.memberId)) {
            skipped.push({ reason: "paid_by_workplace_batch", rowId: row.id })
            continue
          }

          // The same claim as a single apply: a row applied meanwhile (by a
          // concurrent run or by hand) matches nothing and is skipped.
          const claimed = await tx.monthlyRecordMember.updateMany({
            where: { id: row.id, status: "pending", tenantId: input.tenantId },
            data: { status: "applied" },
          })
          if (claimed.count !== 1) {
            skipped.push({ reason: "already_paid", rowId: row.id })
            continue
          }

          const amount = Number(row.calculatedPayableAmount)
          const applied = await postClaimedMonthlyRecordRow(
            {
              actorUserId: input.actorUserId,
              channel: "payroll",
              paymentAllocationPreference:
                row.member.paymentAllocationPreference,
              row: { ...row, monthlyRecord },
              tenantId: input.tenantId,
              totalPaidAmount: amount,
            },
            tx
          )
          chunkReceived.push({ amount, memberId: row.memberId, rowId: row.id })
          chunkPostings.push({
            amount,
            contributionId: applied.contributionId,
            contributionPlanId: row.contributionPlanId,
            memberId: row.memberId,
          })
        }

        if (chunkReceived.length === 0) return

        batchId = await recordWorkplaceBatchPostings(
          {
            actorUserId: input.actorUserId,
            postedAt,
            postings: chunkPostings.map((posting) => ({
              contributionId: posting.contributionId,
              contributionPlanId: posting.contributionPlanId,
              expectedAmount: posting.amount,
              memberId: posting.memberId,
              paidAmount: posting.amount,
            })),
            record,
            tenantId: input.tenantId,
            workplaceId: workplace.id,
          },
          tx
        )
        await tx.auditLog.create({
          data: {
            action: "monthly_record.workplace_received",
            actorType: "user",
            actorUserId: input.actorUserId,
            entityId: record.id,
            entityType: "MonthlyRecord",
            metadata: {
              collectionSourceBatchId: batchId,
              deductionSourceId: workplace.id,
              periodLabel: record.periodLabel,
              receivedAmount: chunkReceived.reduce(
                (total, item) => total + item.amount,
                0
              ),
              rowIds: chunkReceived.map((item) => item.rowId),
            },
            occurredAt: new Date(),
            tenantId: input.tenantId,
          },
        })
        received.push(...chunkReceived)
      },
      { maxWait: 10_000, timeout: 60_000 }
    )
  }

  return {
    batchId,
    periodLabel: record.periodLabel,
    receivedAmount: received.reduce((total, item) => total + item.amount, 0),
    receivedCount: received.length,
    received,
    skipped,
    workplaceName: workplace.name,
  }
}

type WorkplaceBatchPosting = {
  contributionId: string | null
  contributionPlanId: string | null
  expectedAmount: number
  memberId: string
  paidAmount: number
}

// Records monthly-record payments on the workplace's
// `CollectionSourceContributionBatch` for the month (one posted row per
// member), as workplace receiving and a single "Mark paid" both do. A staged
// or undone row for the same member is closed with the new posting. Runs in
// the caller's posting transaction; returns the batch id.
async function recordWorkplaceBatchPostings(
  input: {
    actorUserId: string
    postedAt: Date
    postings: WorkplaceBatchPosting[]
    record: { periodLabel: string; periodMonth: number; periodYear: number }
    tenantId: string
    workplaceId: string
  },
  tx: PrismaClient
) {
  const batch = await tx.collectionSourceContributionBatch.upsert({
    where: {
      tenantId_deductionSourceId_periodYear_periodMonth: {
        deductionSourceId: input.workplaceId,
        periodMonth: input.record.periodMonth,
        periodYear: input.record.periodYear,
        tenantId: input.tenantId,
      },
    },
    create: {
      createdByUserId: input.actorUserId,
      deductionSourceId: input.workplaceId,
      periodLabel: input.record.periodLabel,
      periodMonth: input.record.periodMonth,
      periodYear: input.record.periodYear,
      postedByUserId: input.actorUserId,
      tenantId: input.tenantId,
    },
    update: { postedByUserId: input.actorUserId },
    select: { id: true },
  })
  const existingBatchRows =
    await tx.collectionSourceContributionBatchRow.findMany({
      where: {
        batchId: batch.id,
        memberId: {
          in: input.postings.map((posting) => posting.memberId),
        },
      },
      select: { memberId: true },
    })
  const existingMemberIds = new Set(
    existingBatchRows.map((row) => row.memberId)
  )
  const newBatchRows = input.postings.filter(
    (posting) => !existingMemberIds.has(posting.memberId)
  )

  if (newBatchRows.length > 0) {
    await tx.collectionSourceContributionBatchRow.createMany({
      data: newBatchRows.map((posting) => ({
        batchId: batch.id,
        contributionId: posting.contributionId,
        contributionPlanId: posting.contributionPlanId,
        expectedAmount: posting.expectedAmount,
        memberId: posting.memberId,
        paidAmount: posting.paidAmount,
        postedAt: input.postedAt,
        status: "posted" as const,
        tenantId: input.tenantId,
      })),
      skipDuplicates: true,
    })
  }

  // A staged row for the same member (from the contributions page), or a
  // row whose posting was undone, is closed with this posting so it can
  // never be posted a second time.
  for (const posting of input.postings) {
    if (!existingMemberIds.has(posting.memberId)) continue
    await tx.collectionSourceContributionBatchRow.updateMany({
      where: {
        batchId: batch.id,
        memberId: posting.memberId,
        OR: [
          { contributionId: null },
          { contribution: { status: "reversed" } },
        ],
      },
      data: {
        blocker: null,
        contributionId: posting.contributionId,
        exceptionReason: null,
        paidAmount: posting.paidAmount,
        postedAt: input.postedAt,
        status: "posted",
      },
    })
  }

  await refreshCollectionSourceBatchStatus(
    { batchId: batch.id, tenantId: input.tenantId },
    tx
  )

  return batch.id
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
    throw new QueryInfrastructureError(
      "Ledger accounts not initialized for this cooperative"
    )
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
    throw new QueryInfrastructureError(
      "Ledger accounts not initialized for this cooperative"
    )
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

// The levy and other monthly-collection charges this row's payment added
// (tagged in their applicability snapshot) are undone with it, so cancel then
// re-apply never charges twice. Posted charges get an opposite entry;
// charges still waiting for a separate payment are waived. Rows applied
// before the tag existed carry no tag and are left as they were.
async function undoMonthlyRecordCharges(input: {
  actorUserId: string
  memberId: string
  monthlyRecordMemberId: string
  periodLabel: string
  tenantId: string
  tx: PrismaClient
}) {
  const charges = await input.tx.chargeApplication.findMany({
    select: { id: true, status: true },
    where: {
      applicabilitySnapshot: {
        equals: input.monthlyRecordMemberId,
        path: ["monthlyRecordMemberId"],
      },
      memberId: input.memberId,
      status: { in: ["pending", "posted"] },
      tenantId: input.tenantId,
    },
  })
  const reason = `Monthly record ${input.periodLabel} payment was cancelled.`

  for (const charge of charges) {
    const correction = {
      actorUserId: input.actorUserId,
      chargeApplicationId: charge.id,
      reason,
      tenantId: input.tenantId,
    }

    if (charge.status === "posted") {
      await reverseChargeApplicationInTransaction(correction, input.tx)
    } else {
      await waiveChargeApplicationInTransaction(correction, input.tx)
    }
  }

  return charges.length
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

    if (!row)
      throw ExpectedQueryError.notFound("Monthly record member row not found.")
    if (row.status === "cancelled")
      throw ExpectedQueryError.conflict(
        "This monthly record row is already cancelled."
      )
    if (row.monthlyRecord.status === "closed") {
      throw ExpectedQueryError.conflict(
        "Closed monthly records cannot be changed."
      )
    }

    // Claim the row first: a second, concurrent cancel waits on this row
    // lock, then finds it no longer in the status it read and stops here,
    // so the payment, repayment and charges are never undone twice.
    const claimed = await tx.monthlyRecordMember.updateMany({
      where: { id: row.id, status: row.status, tenantId: input.tenantId },
      data: { cancelledAt: new Date(), status: "cancelled" },
    })
    if (claimed.count !== 1) {
      throw ExpectedQueryError.conflict(
        "This monthly record row is already cancelled."
      )
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

      await undoMonthlyRecordCharges({
        actorUserId: input.actorUserId,
        memberId: row.memberId,
        monthlyRecordMemberId: row.id,
        periodLabel: row.monthlyRecord.periodLabel,
        tenantId: input.tenantId,
        tx: tx as unknown as PrismaClient,
      })
    }

    const cancelled = await tx.monthlyRecordMember.findUniqueOrThrow({
      where: { id: row.id },
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
