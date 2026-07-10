import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"
import { getTenantInitialMigrationState } from "./migration"

export type ProcurementRequestStatus =
  | "active"
  | "approved"
  | "cancelled"
  | "completed"
  | "purchased"
  | "rejected"
  | "submitted"
  | "under_review"

export type ProcurementRequestRow = {
  approvedCost: number | null
  approvedMonthlyRepayment: number | null
  approvedRepaymentMonths: number | null
  allowsCommitmentReductionDuringPayback: boolean
  createdAt: Date
  createdByUser: {
    email: string
    fullName: string
    id: string
  }
  createdByUserId: string
  estimatedMonthlyRepayment: number
  id: string
  itemDescription: string | null
  itemName: string
  member: {
    email: string | null
    fullName: string
    id: string
    memberNumber: string
  }
  memberId: string
  policyMaximumPaybackMonths: number
  requestedAt: Date
  requestedCost: number
  requestedRepaymentMonths: number
  reviewedAt: Date | null
  reviewedByUser: {
    email: string
    fullName: string
    id: string
  } | null
  reviewedByUserId: string | null
  reviewNotes: string | null
  outstandingAmount: number
  purchasedAt: Date | null
  purchasedByUserId: string | null
  purchaseNotes: string | null
  purchaseReference: string | null
  repaymentScheduleItems: ProcurementRepaymentScheduleItemRow[]
  status: ProcurementRequestStatus
  vendorName: string | null
}

export type ProcurementRepaymentScheduleItemRow = {
  amount: number
  dueDate: Date
  id: string
  installmentNumber: number
  paidAmount: number
  status: "due" | "overdue" | "paid" | "partially_paid" | "pending" | "waived"
}

export type ProcurementSummary = {
  activeRequests: number
  approvedRequests: number
  dueScheduleItems: number
  outstandingAmount: number
  overdueScheduleItems: number
  pendingRequests: number
  rejectedRequests: number
  totalApprovedCost: number
  totalRequestedCost: number
}

const procurementRequestStatuses = new Set([
  "active",
  "approved",
  "cancelled",
  "completed",
  "purchased",
  "rejected",
  "submitted",
  "under_review",
])
const pendingProcurementStatuses = ["submitted", "under_review"] as const
const activeFinancingStatuses = ["approved", "disbursed", "active"] as const
const payableScheduleStatuses = [
  "due",
  "overdue",
  "partially_paid",
  "pending",
] as const

function trimRequired(value: string, label: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error(`${label} is required.`)
  }

  return trimmed
}

function assertPositiveAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`)
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive whole number.`)
  }
}

function calculateMonthlyRepayment(amount: number, months: number) {
  return Math.ceil((amount / months) * 100) / 100
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function addMonthsUtc(value: Date, months: number) {
  const targetYear = value.getUTCFullYear()
  const targetMonth = value.getUTCMonth() + months
  const targetDay = Math.min(
    value.getUTCDate(),
    new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  )

  return new Date(Date.UTC(targetYear, targetMonth, targetDay))
}

function addDaysUtc(value: Date, days: number) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate() + days
    )
  )
}

function startOfDayUtc(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  )
}

function buildScheduleAmounts(totalAmount: number, months: number) {
  const monthlyAmount = calculateMonthlyRepayment(totalAmount, months)

  return Array.from({ length: months }, (_, index) => {
    if (index === months - 1) {
      return roundMoney(totalAmount - monthlyAmount * (months - 1))
    }

    return monthlyAmount
  })
}

function normalizeScheduleStatus(
  schedule: any,
  asOf: Date
): ProcurementRepaymentScheduleItemRow["status"] {
  if (schedule.status === "paid" || schedule.status === "waived") {
    return schedule.status
  }

  const dueDate = startOfDayUtc(schedule.dueDate)
  const today = startOfDayUtc(asOf)
  const tomorrow = addDaysUtc(today, 1)

  if (dueDate < today) {
    return "overdue"
  }

  if (dueDate >= today && dueDate < tomorrow) {
    return "due"
  }

  return schedule.status
}

function normalizeProcurementRequest(
  request: any,
  asOf = new Date()
): ProcurementRequestRow {
  const repaymentScheduleItems = (request.repaymentScheduleItems ?? [])
    .map((schedule: any) => ({
      amount: Number(schedule.amount),
      dueDate: schedule.dueDate,
      id: schedule.id,
      installmentNumber: schedule.installmentNumber,
      paidAmount: Number(schedule.paidAmount ?? 0),
      status: normalizeScheduleStatus(schedule, asOf),
    }))
    .sort(
      (
        left: ProcurementRepaymentScheduleItemRow,
        right: ProcurementRepaymentScheduleItemRow
      ) => left.installmentNumber - right.installmentNumber
    )
  const outstandingAmount = repaymentScheduleItems.reduce(
    (sum: number, schedule: ProcurementRepaymentScheduleItemRow) =>
      sum + Math.max(0, schedule.amount - schedule.paidAmount),
    0
  )

  return {
    approvedCost:
      request.approvedCost === null || request.approvedCost === undefined
        ? null
        : Number(request.approvedCost),
    approvedMonthlyRepayment:
      request.approvedMonthlyRepayment === null ||
      request.approvedMonthlyRepayment === undefined
        ? null
        : Number(request.approvedMonthlyRepayment),
    approvedRepaymentMonths: request.approvedRepaymentMonths ?? null,
    allowsCommitmentReductionDuringPayback:
      request.allowsCommitmentReductionDuringPayback ?? false,
    createdAt: request.createdAt,
    createdByUser: {
      email: request.createdByUser.email,
      fullName: request.createdByUser.fullName,
      id: request.createdByUser.id,
    },
    createdByUserId: request.createdByUserId,
    estimatedMonthlyRepayment: Number(request.estimatedMonthlyRepayment),
    id: request.id,
    itemDescription: request.itemDescription ?? null,
    itemName: request.itemName,
    member: {
      email: request.member.email ?? null,
      fullName: request.member.fullName,
      id: request.member.id,
      memberNumber: request.member.memberNumber,
    },
    memberId: request.memberId,
    policyMaximumPaybackMonths: request.policyMaximumPaybackMonths ?? 12,
    requestedAt: request.requestedAt,
    requestedCost: Number(request.requestedCost),
    requestedRepaymentMonths: request.requestedRepaymentMonths,
    reviewedAt: request.reviewedAt ?? null,
    reviewedByUser: request.reviewedByUser
      ? {
          email: request.reviewedByUser.email,
          fullName: request.reviewedByUser.fullName,
          id: request.reviewedByUser.id,
        }
      : null,
    reviewedByUserId: request.reviewedByUserId ?? null,
    reviewNotes: request.reviewNotes ?? null,
    outstandingAmount: roundMoney(outstandingAmount),
    purchasedAt: request.purchasedAt ?? null,
    purchasedByUserId: request.purchasedByUserId ?? null,
    purchaseNotes: request.purchaseNotes ?? null,
    purchaseReference: request.purchaseReference ?? null,
    repaymentScheduleItems,
    status: request.status,
    vendorName: request.vendorName ?? null,
  }
}

function procurementInclude() {
  return {
    createdByUser: {
      select: {
        email: true,
        fullName: true,
        id: true,
      },
    },
    member: {
      select: {
        email: true,
        fullName: true,
        id: true,
        memberNumber: true,
      },
    },
    reviewedByUser: {
      select: {
        email: true,
        fullName: true,
        id: true,
      },
    },
    repaymentScheduleItems: {
      orderBy: { installmentNumber: "asc" as const },
    },
  } as const
}

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

async function readProcurementRequest(
  input: {
    procurementRequestId: string
    tenantId: string
  },
  prisma: any
) {
  const request = await prisma.procurementRequest.findFirst({
    include: procurementInclude(),
    where: {
      id: input.procurementRequestId,
      tenantId: input.tenantId,
    },
  })

  if (!request) {
    throw new Error("Procurement request was not found.")
  }

  return request
}

export async function listProcurementRequests(
  input: {
    limit?: number
    memberId?: string
    status?: ProcurementRequestStatus
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ProcurementRequestRow[]> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  if (input.status && !procurementRequestStatuses.has(input.status)) {
    throw new Error("Procurement request status is not supported.")
  }

  const requests = await prisma.procurementRequest.findMany({
    include: procurementInclude(),
    orderBy: [{ requestedAt: "desc" }, { createdAt: "desc" }],
    take: input.limit ?? 50,
    where: {
      tenantId: input.tenantId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
  })

  return requests.map((request: any) => normalizeProcurementRequest(request))
}

export async function getProcurementSummary(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<ProcurementSummary> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) {
    return {
      activeRequests: 0,
      approvedRequests: 0,
      dueScheduleItems: 0,
      outstandingAmount: 0,
      overdueScheduleItems: 0,
      pendingRequests: 0,
      rejectedRequests: 0,
      totalApprovedCost: 0,
      totalRequestedCost: 0,
    }
  }

  const today = startOfDayUtc(new Date())
  const tomorrow = addDaysUtc(today, 1)
  const [
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    activeRequests,
    dueScheduleItems,
    overdueScheduleItems,
    outstandingScheduleTotals,
    requestedTotals,
    approvedTotals,
  ] = await Promise.all([
    prisma.procurementRequest.count({
      where: { status: { in: [...pendingProcurementStatuses] }, tenantId },
    }),
    prisma.procurementRequest.count({
      where: { status: "approved", tenantId },
    }),
    prisma.procurementRequest.count({
      where: { status: "rejected", tenantId },
    }),
    prisma.procurementRequest.count({
      where: { status: { in: ["purchased", "active"] }, tenantId },
    }),
    prisma.procurementRepaymentScheduleItem.count({
      where: {
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: [...payableScheduleStatuses] },
        tenantId,
      },
    }),
    prisma.procurementRepaymentScheduleItem.count({
      where: {
        dueDate: { lt: today },
        status: { in: [...payableScheduleStatuses] },
        tenantId,
      },
    }),
    prisma.procurementRepaymentScheduleItem.aggregate({
      _sum: { amount: true, paidAmount: true },
      where: {
        status: { in: [...payableScheduleStatuses] },
        tenantId,
      },
    }),
    prisma.procurementRequest.aggregate({
      _sum: { requestedCost: true },
      where: { tenantId },
    }),
    prisma.procurementRequest.aggregate({
      _sum: { approvedCost: true },
      where: { status: { in: ["approved", "purchased", "active"] }, tenantId },
    }),
  ])

  return {
    activeRequests,
    approvedRequests,
    dueScheduleItems,
    outstandingAmount: roundMoney(
      Number(outstandingScheduleTotals._sum.amount ?? 0) -
        Number(outstandingScheduleTotals._sum.paidAmount ?? 0)
    ),
    overdueScheduleItems,
    pendingRequests,
    rejectedRequests,
    totalApprovedCost: Number(approvedTotals._sum.approvedCost ?? 0),
    totalRequestedCost: Number(requestedTotals._sum.requestedCost ?? 0),
  }
}

export async function createProcurementRequest(
  input: {
    actorUserId: string
    itemDescription?: string | null
    itemName: string
    memberId: string
    requestedCost: number
    requestedRepaymentMonths: number
    tenantId: string
    vendorName?: string | null
  },
  prismaOverride?: PrismaClient
): Promise<ProcurementRequestRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const itemName = trimRequired(input.itemName, "Procurement item")
  assertPositiveAmount(input.requestedCost, "Requested cost")
  assertPositiveInteger(
    input.requestedRepaymentMonths,
    "Requested repayment months"
  )

  const [member, policy] = await Promise.all([
    prisma.member.findFirst({
      select: { id: true },
      where: {
        id: input.memberId,
        status: "active",
        tenantId: input.tenantId,
      },
    }),
    prisma.tenantPolicy.findUnique({
      where: { tenantId: input.tenantId },
    }),
  ])

  if (!member) {
    throw new Error("Member does not belong to this cooperative.")
  }

  const procurementMaximumPaybackMonths = Number(
    policy?.procurementMaximumPaybackMonths ?? 12
  )

  if (input.requestedRepaymentMonths > procurementMaximumPaybackMonths) {
    throw new Error(
      `Requested procurement repayment months cannot exceed ${procurementMaximumPaybackMonths}.`
    )
  }

  if (policy?.activeFinancingBlocksProcurement ?? true) {
    const activeFinancingCount = await prisma.loan.count({
      where: {
        memberId: input.memberId,
        status: { in: [...activeFinancingStatuses] },
        tenantId: input.tenantId,
      },
    })

    if (activeFinancingCount > 0) {
      throw new Error(
        "This cooperative blocks procurement while the member has active financing."
      )
    }
  }

  const estimatedMonthlyRepayment = calculateMonthlyRepayment(
    input.requestedCost,
    input.requestedRepaymentMonths
  )

  return prisma.$transaction(async (tx: any) => {
    const request = await tx.procurementRequest.create({
      data: {
        createdByUserId: input.actorUserId,
        estimatedMonthlyRepayment,
        itemDescription: input.itemDescription?.trim() || null,
        itemName,
        memberId: input.memberId,
        allowsCommitmentReductionDuringPayback:
          policy?.procurementAllowsCommitmentReductionDuringPayback ?? false,
        policyMaximumPaybackMonths: procurementMaximumPaybackMonths,
        requestedAt: new Date(),
        requestedCost: input.requestedCost,
        requestedRepaymentMonths: input.requestedRepaymentMonths,
        status: "submitted",
        tenantId: input.tenantId,
        vendorName: input.vendorName?.trim() || null,
      },
      include: procurementInclude(),
    })

    await createAuditLogEntry(
      {
        action: "procurement.request_submitted",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: request.id,
        entityType: "ProcurementRequest",
        metadata: {
          itemName,
          memberId: input.memberId,
          policyMaximumPaybackMonths: procurementMaximumPaybackMonths,
          requestedCost: input.requestedCost,
          requestedRepaymentMonths: input.requestedRepaymentMonths,
          vendorName: input.vendorName?.trim() || null,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeProcurementRequest(request)
  })
}

export async function reviewProcurementRequest(
  input: {
    actorUserId: string
    approvedCost?: number | null
    approvedRepaymentMonths?: number | null
    notes?: string | null
    procurementRequestId: string
    status: "approved" | "rejected" | "under_review"
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ProcurementRequestRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  if (!procurementRequestStatuses.has(input.status)) {
    throw new Error("Procurement request status is not supported.")
  }

  return prisma.$transaction(async (tx: any) => {
    const existingRequest = await readProcurementRequest(
      {
        procurementRequestId: input.procurementRequestId,
        tenantId: input.tenantId,
      },
      tx
    )
    const policy = await tx.tenantPolicy.findUnique({
      where: { tenantId: input.tenantId },
    })
    const procurementMaximumPaybackMonths = Number(
      policy?.procurementMaximumPaybackMonths ?? 12
    )

    const approvedCost =
      input.status === "approved"
        ? (input.approvedCost ?? Number(existingRequest.requestedCost))
        : null
    const approvedRepaymentMonths =
      input.status === "approved"
        ? (input.approvedRepaymentMonths ??
          existingRequest.requestedRepaymentMonths)
        : null
    let approvedMonthlyRepayment: number | null = null

    if (input.status === "approved") {
      const approvedRequestCost =
        approvedCost ?? Number(existingRequest.requestedCost)
      const approvedRequestRepaymentMonths =
        approvedRepaymentMonths ?? existingRequest.requestedRepaymentMonths

      assertPositiveAmount(approvedRequestCost, "Approved cost")
      assertPositiveInteger(
        approvedRequestRepaymentMonths,
        "Approved repayment months"
      )

      if (approvedRequestRepaymentMonths > procurementMaximumPaybackMonths) {
        throw new Error(
          `Approved procurement repayment months cannot exceed ${procurementMaximumPaybackMonths}.`
        )
      }

      approvedMonthlyRepayment = calculateMonthlyRepayment(
        approvedRequestCost,
        approvedRequestRepaymentMonths
      )
    }

    const request = await tx.procurementRequest.update({
      where: { id: existingRequest.id },
      data: {
        approvedCost,
        approvedMonthlyRepayment,
        approvedRepaymentMonths,
        allowsCommitmentReductionDuringPayback:
          input.status === "approved"
            ? (policy?.procurementAllowsCommitmentReductionDuringPayback ??
              false)
            : existingRequest.allowsCommitmentReductionDuringPayback,
        policyMaximumPaybackMonths:
          input.status === "approved"
            ? procurementMaximumPaybackMonths
            : existingRequest.policyMaximumPaybackMonths,
        reviewedAt: new Date(),
        reviewedByUserId: input.actorUserId,
        reviewNotes: input.notes?.trim() || null,
        status: input.status,
      },
      include: procurementInclude(),
    })

    await createAuditLogEntry(
      {
        action: `procurement.request_${input.status}`,
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: request.id,
        entityType: "ProcurementRequest",
        metadata: {
          approvedCost,
          approvedRepaymentMonths,
          allowsCommitmentReductionDuringPayback:
            input.status === "approved"
              ? (policy?.procurementAllowsCommitmentReductionDuringPayback ??
                false)
              : existingRequest.allowsCommitmentReductionDuringPayback,
          memberId: request.memberId,
          notes: input.notes?.trim() || null,
          policyMaximumPaybackMonths:
            input.status === "approved"
              ? procurementMaximumPaybackMonths
              : existingRequest.policyMaximumPaybackMonths,
          previousStatus: existingRequest.status,
          status: input.status,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeProcurementRequest(request)
  })
}

export async function recordProcurementPurchase(
  input: {
    actorUserId: string
    firstDueDate?: Date | null
    procurementRequestId: string
    purchaseDate: Date
    purchaseNotes?: string | null
    purchaseReference?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ProcurementRequestRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const purchaseDate = input.purchaseDate
  const firstDueDate = startOfDayUtc(
    input.firstDueDate ?? addMonthsUtc(purchaseDate, 1)
  )
  const purchaseReference = input.purchaseReference?.trim() || null
  const purchaseNotes = input.purchaseNotes?.trim() || null

  if (firstDueDate < startOfDayUtc(purchaseDate)) {
    throw new Error(
      "First procurement repayment due date cannot be before the purchase date."
    )
  }

  return prisma.$transaction(async (tx: any) => {
    const existingRequest = await readProcurementRequest(
      {
        procurementRequestId: input.procurementRequestId,
        tenantId: input.tenantId,
      },
      tx
    )

    if (existingRequest.status !== "approved") {
      throw new Error(
        "Only approved procurement requests can be marked purchased."
      )
    }

    const approvedCost = Number(existingRequest.approvedCost ?? 0)
    const approvedRepaymentMonths = existingRequest.approvedRepaymentMonths

    if (approvedCost <= 0 || !approvedRepaymentMonths) {
      throw new Error(
        "Approved procurement cost and repayment months are required before purchase."
      )
    }

    const existingScheduleCount =
      typeof tx.procurementRepaymentScheduleItem?.count === "function"
        ? await tx.procurementRepaymentScheduleItem.count({
            where: {
              procurementRequestId: existingRequest.id,
              tenantId: input.tenantId,
            },
          })
        : 0

    if (existingScheduleCount > 0) {
      throw new Error(
        "This procurement request already has a repayment schedule."
      )
    }

    const scheduleAmounts = buildScheduleAmounts(
      approvedCost,
      approvedRepaymentMonths
    )

    const request = await tx.procurementRequest.update({
      data: {
        purchaseNotes,
        purchaseReference,
        purchasedAt: purchaseDate,
        purchasedByUserId: input.actorUserId,
        status: "active",
      },
      include: procurementInclude(),
      where: { id: existingRequest.id },
    })

    await tx.procurementRepaymentScheduleItem.createMany({
      data: scheduleAmounts.map((amount, index) => ({
        amount,
        dueDate: addMonthsUtc(firstDueDate, index),
        installmentNumber: index + 1,
        memberId: existingRequest.memberId,
        procurementRequestId: existingRequest.id,
        status: "pending",
        tenantId: input.tenantId,
      })),
    })

    await createAuditLogEntry(
      {
        action: "procurement.purchase_recorded",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: request.id,
        entityType: "ProcurementRequest",
        metadata: {
          approvedCost,
          approvedRepaymentMonths,
          firstDueDate: firstDueDate.toISOString(),
          memberId: request.memberId,
          previousStatus: existingRequest.status,
          purchaseDate: purchaseDate.toISOString(),
          purchaseReference,
          scheduleTotal: roundMoney(
            scheduleAmounts.reduce((sum, amount) => sum + amount, 0)
          ),
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeProcurementRequest({
      ...request,
      repaymentScheduleItems: scheduleAmounts.map((amount, index) => ({
        amount,
        dueDate: addMonthsUtc(firstDueDate, index),
        id: `generated-${index + 1}`,
        installmentNumber: index + 1,
        paidAmount: 0,
        status: "pending",
      })),
    })
  })
}
