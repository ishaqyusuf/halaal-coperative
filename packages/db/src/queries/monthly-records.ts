import type { LoanStatus, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError, QueryInfrastructureError } from "../query-error"
import {
  applyApplicableWorkflowChargesInTransaction,
  loadChargeQuoter,
} from "./charges"
import { recordMemberPaymentMutation } from "./contributions"
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
export async function getMonthlyRecordDetail(
  tenantId: string,
  monthlyRecordId: string,
  prismaOverride?: PrismaClient
): Promise<MonthlyRecordDetail | null> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

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
  const [loans, quoteCharges, appliedCharges] = memberIds.length
    ? await Promise.all([
        prisma.loan.findMany({
          where: loanLookupWhere,
          select: { id: true, memberId: true, status: true },
          orderBy: [{ disbursedAt: "desc" }, { createdAt: "desc" }],
        }),
        loadChargeQuoter(
          {
            assessedAt: start,
            tenantId,
            trigger: "monthly_collection",
            workflow: "commitment_collection",
          },
          prisma
        ),
        prisma.chargeApplication.findMany({
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
        }),
      ])
    : [[], () => [], []]
  const loanStatusById = new Map(loans.map((loan) => [loan.id, loan.status]))
  const activeLoanByMemberId = new Map<string, (typeof loans)[number]>()
  for (const loan of loans) {
    if (!activeLoanByMemberId.has(loan.memberId)) {
      activeLoanByMemberId.set(loan.memberId, loan)
    }
  }
  const totalPaidByMemberId = new Map(
    record.memberRows.map((row) => [row.memberId, Number(row.totalPaidAmount)])
  )
  const calculatedChargesByMemberId = new Map<string, number>()
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

  for (const row of record.memberRows) {
    const quotes = quoteCharges(totalPaidByMemberId.get(row.memberId) ?? 0)

    calculatedChargesByMemberId.set(
      row.memberId,
      quotes.reduce((total, charge) => total + charge.amount, 0)
    )

    for (const quote of quotes) {
      const existing = calculatedChargesByDefinitionId.get(
        quote.chargeDefinitionId
      )
      calculatedChargesByDefinitionId.set(quote.chargeDefinitionId, {
        amount: quote.effectiveAmount,
        code: quote.code,
        kind: quote.chargeValueType === "percentage" ? "percentage" : "fixed",
        name: quote.name,
        totalAmount: (existing?.totalAmount ?? 0) + quote.amount,
      })
    }
  }
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
        totalAmount: charge.totalAmount,
      }
    }
  )
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

// The /monthly-records page GET: read-only, and a constant number of queries.
// A month with no record (or no seeded rows) is created by the "Create month"
// action, which runs `ensureMonthlyRecord`.
export async function getMonthlyRecordsPageData(
  input: {
    selectedRecordId?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [records, settings] = await Promise.all([
    listMonthlyRecords(input.tenantId, prisma),
    getMonthlyRecordSettings(input.tenantId, prisma),
  ])
  const selectedRecordId =
    records.find((record) => record.id === input.selectedRecordId)?.id ??
    records[0]?.id
  const selectedRecord = selectedRecordId
    ? await getMonthlyRecordDetail(input.tenantId, selectedRecordId, prisma)
    : null

  return { records, selectedRecord, settings }
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

export type MonthlyRecordRowsQuery = {
  cursor?: string | null
  pageSize?: number
  q?: string | null
  sort?: [MonthlyRecordRowSortField, "asc" | "desc"] | null
  status?: MonthlyRecordMemberStatusValue | null
}

// Filters, sorts and pages a month's rows in memory. Shared by the rows
// procedure and the page, so the page can hydrate the table's first page from
// the detail it already loaded instead of computing it twice.
export function pageMonthlyRecordRows(
  rows: MonthlyRecordMemberRow[],
  input: MonthlyRecordRowsQuery = {}
) {
  const pageSize = input.pageSize ?? 50
  const query = input.q?.trim().toLowerCase()
  const filtered = rows.filter(
    (row) =>
      (!input.status || row.status === input.status) &&
      (!query ||
        row.memberName.toLowerCase().includes(query) ||
        row.memberNumber.toLowerCase().includes(query))
  )
  const sorted = input.sort ? sortMonthlyRecordRows(filtered, input.sort) : filtered
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
      total: sorted.length,
    },
  }
}

function sortMonthlyRecordRows(
  rows: MonthlyRecordMemberRow[],
  [field, direction]: [MonthlyRecordRowSortField, "asc" | "desc"]
) {
  const factor = direction === "asc" ? 1 : -1

  return [...rows].sort((left, right) => {
    const leftValue = left[field]
    const rightValue = right[field]

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor
    }

    return String(leftValue).localeCompare(String(rightValue)) * factor
  })
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
        throw ExpectedQueryError.notFound("Monthly record member row not found.")
      }
      if (row.status === "applied")
        throw ExpectedQueryError.conflict(
          "This monthly record row has already been applied."
        )
      if (row.monthlyRecord.status === "closed")
        throw ExpectedQueryError.conflict(
          "Closed monthly records cannot be changed."
        )

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
          paymentAllocationPreference: true,
        },
      })

      if (!member) throw ExpectedQueryError.notFound("Member not found.")

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
      const assessedAt = getPeriodRange(
        row.monthlyRecord.periodYear,
        row.monthlyRecord.periodMonth
      ).start

      const posted = await recordMemberPaymentMutation(
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
    },
    {
      maxWait: 5_000,
      timeout: 15_000,
    }
  )
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
