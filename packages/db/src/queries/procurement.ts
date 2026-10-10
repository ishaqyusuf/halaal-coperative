import type { PrismaClient } from "../../generated/prisma/client"
import { AppError } from "@halaalvest/errors"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError, isUniqueConstraintError } from "../query-error"
import { createAuditLogEntry } from "./audit"
import { applyApplicableWorkflowChargesInTransaction } from "./charges"
import { getTenantInitialMigrationState } from "./migration"
import { getTenantOperationProfile } from "./operation-profile"

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
  totalRequests: number
  totalApprovedCost: number
  totalRequestedCost: number
}

export type ProcurementRequestSource =
  | "member_self_service"
  | "staff"
  | "system"

export type ProcurementRequestSortField =
  | "approvedCost"
  | "estimatedMonthlyRepayment"
  | "itemName"
  | "memberName"
  | "outstandingAmount"
  | "requestedAt"
  | "requestedCost"
  | "status"
  | "vendorName"

export type ListProcurementRequestPageFilters = {
  cursor?: string | null
  limit?: number
  memberId?: string
  page?: number
  pageSize?: number
  search?: string
  sort?: [ProcurementRequestSortField, "asc" | "desc"] | null
  status?: ProcurementRequestStatus
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
const activeProcurementObligationStatuses = ["active", "purchased"] as const

function trimRequired(value: string, label: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: `${label} is required.`,
    })
  }

  return trimmed
}

function assertPositiveAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: `${label} must be greater than zero.`,
    })
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: `${label} must be a positive whole number.`,
    })
  }
}

function assertProcurementRequestCreationAllowed(input: {
  accessMode: string
  canMemberCreate: boolean
  canStaffCreate: boolean
  requestSource: ProcurementRequestSource
}) {
  if (input.requestSource === "system") {
    return
  }

  if (input.requestSource === "member_self_service") {
    if (input.canMemberCreate) {
      return
    }

    if (input.accessMode === "office_only") {
      throw new AppError({
        code: "PRECONDITION_FAILED",
        publicMessage:
          "Procurement requests must be submitted through the cooperative office.",
      })
    }
  } else if (input.canStaffCreate) {
    return
  }

  if (input.accessMode === "read_only") {
    throw new AppError({
      code: "PRECONDITION_FAILED",
      publicMessage: "Procurement is currently read-only for this cooperative.",
    })
  }

  throw new AppError({
    code: "PRECONDITION_FAILED",
    publicMessage: "Procurement is not enabled for this cooperative.",
  })
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
    throw new AppError({
      code: "PRECONDITION_FAILED",
      publicMessage:
        "Live financial record writes are locked until initial migration is finalized.",
    })
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
    throw new AppError({
      code: "NOT_FOUND",
      publicMessage: "Procurement request was not found.",
    })
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
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Procurement request status is not supported.",
    })
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

export async function getProcurementRequest(
  input: {
    memberId?: string
    procurementRequestId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ProcurementRequestRow | null> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return null

  const request = await prisma.procurementRequest.findFirst({
    include: procurementInclude(),
    where: {
      id: input.procurementRequestId,
      tenantId: input.tenantId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
    },
  })

  return request ? normalizeProcurementRequest(request) : null
}

function getProcurementRequestOrderBy(
  sort?: [ProcurementRequestSortField, "asc" | "desc"] | null
) {
  const [sortField, direction] = normalizeProcurementRequestSort(sort)

  if (sortField === "memberName") {
    return [
      { member: { fullName: direction } },
      { requestedAt: "desc" as const },
      { id: "desc" as const },
    ]
  }

  if (sortField === "vendorName" || sortField === "approvedCost") {
    return [
      { [sortField]: { nulls: "last" as const, sort: direction } },
      { requestedAt: "desc" as const },
      { id: "desc" as const },
    ]
  }

  if (sortField === "requestedAt") {
    return [
      { requestedAt: direction },
      { createdAt: direction },
      { id: direction },
    ]
  }

  return [
    { [sortField]: direction },
    { requestedAt: "desc" as const },
    { id: "desc" as const },
  ]
}

type ProcurementRequestPageCursor = {
  approvedCost: number | null
  createdAt: string
  estimatedMonthlyRepayment: number
  id: string
  itemName: string
  memberName: string
  requestedAt: string
  requestedCost: number
  sortDirection: "asc" | "desc"
  sortField: Exclude<
    ProcurementRequestSortField,
    "outstandingAmount" | "status"
  >
  status: ProcurementRequestStatus
  vendorName: string | null
}

function normalizeProcurementRequestSort(
  sort?: [ProcurementRequestSortField, "asc" | "desc"] | null
) {
  const [sortField, direction] = sort ?? ["requestedAt", "desc"]

  const normalizedSortField =
    sortField === "outstandingAmount" || sortField === "status"
      ? "requestedAt"
      : sortField

  return [normalizedSortField, direction] as const
}

function encodeProcurementRequestPageCursor(
  cursor: ProcurementRequestPageCursor
) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url")
}

function decodeProcurementRequestPageCursor(
  value: string,
  sort?: [ProcurementRequestSortField, "asc" | "desc"] | null
) {
  try {
    const cursor = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as ProcurementRequestPageCursor
    const [sortField, sortDirection] = normalizeProcurementRequestSort(sort)

    if (
      !cursor ||
      cursor.sortField !== sortField ||
      cursor.sortDirection !== sortDirection ||
      typeof cursor.id !== "string" ||
      typeof cursor.itemName !== "string" ||
      typeof cursor.memberName !== "string" ||
      typeof cursor.estimatedMonthlyRepayment !== "number" ||
      typeof cursor.requestedCost !== "number" ||
      typeof cursor.status !== "string" ||
      (typeof cursor.approvedCost !== "number" &&
        cursor.approvedCost !== null) ||
      (typeof cursor.vendorName !== "string" && cursor.vendorName !== null) ||
      Number.isNaN(new Date(cursor.createdAt).getTime()) ||
      Number.isNaN(new Date(cursor.requestedAt).getTime())
    ) {
      throw ExpectedQueryError.validation("Invalid cursor")
    }

    return cursor
  } catch {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Procurement request cursor is invalid.",
    })
  }
}

export function createProcurementRequestPageCursor(
  request: ProcurementRequestRow,
  sort?: [ProcurementRequestSortField, "asc" | "desc"] | null
) {
  const [sortField, sortDirection] = normalizeProcurementRequestSort(sort)

  return encodeProcurementRequestPageCursor({
    approvedCost: request.approvedCost,
    createdAt: request.createdAt.toISOString(),
    estimatedMonthlyRepayment: request.estimatedMonthlyRepayment,
    id: request.id,
    itemName: request.itemName,
    memberName: request.member.fullName,
    requestedAt: request.requestedAt.toISOString(),
    requestedCost: request.requestedCost,
    sortDirection,
    sortField,
    status: request.status,
    vendorName: request.vendorName,
  })
}

function cursorComparison(value: unknown, direction: "asc" | "desc") {
  return direction === "asc" ? { gt: value } : { lt: value }
}

function nullableCursorComparison(
  field: "approvedCost" | "vendorName",
  value: number | string | null,
  direction: "asc" | "desc"
) {
  if (value === null) return null

  return {
    OR: [{ [field]: cursorComparison(value, direction) }, { [field]: null }],
  }
}

function getProcurementRequestPageKeysetWhere(input: {
  cursor: ProcurementRequestPageCursor
  sort?: [ProcurementRequestSortField, "asc" | "desc"] | null
}): any {
  const [sortField, sortDirection] = normalizeProcurementRequestSort(input.sort)
  const cursor = input.cursor

  if (sortField === "requestedAt") {
    return {
      OR: [
        {
          requestedAt: cursorComparison(
            new Date(cursor.requestedAt),
            sortDirection
          ),
        },
        {
          AND: [
            { requestedAt: new Date(cursor.requestedAt) },
            {
              createdAt: cursorComparison(
                new Date(cursor.createdAt),
                sortDirection
              ),
            },
          ],
        },
        {
          AND: [
            { requestedAt: new Date(cursor.requestedAt) },
            { createdAt: new Date(cursor.createdAt) },
            { id: cursorComparison(cursor.id, sortDirection) },
          ],
        },
      ],
    }
  }

  const requestedAtTieBreak = {
    OR: [
      { requestedAt: cursorComparison(new Date(cursor.requestedAt), "desc") },
      {
        AND: [
          { requestedAt: new Date(cursor.requestedAt) },
          { id: cursorComparison(cursor.id, "desc") },
        ],
      },
    ],
  }
  const primaryValue =
    sortField === "memberName" ? cursor.memberName : cursor[sortField]
  const primaryEquals =
    sortField === "memberName"
      ? { member: { is: { fullName: primaryValue } } }
      : { [sortField]: primaryValue }
  const primaryAfter =
    sortField === "memberName"
      ? {
          member: {
            is: { fullName: cursorComparison(primaryValue, sortDirection) },
          },
        }
      : sortField === "approvedCost" || sortField === "vendorName"
        ? nullableCursorComparison(sortField, primaryValue, sortDirection)
        : { [sortField]: cursorComparison(primaryValue, sortDirection) }

  return {
    OR: [
      ...(primaryAfter ? [primaryAfter] : []),
      { AND: [primaryEquals, requestedAtTieBreak] },
    ],
  }
}

function getProcurementRequestWhere(input: {
  memberId?: string
  search?: string
  status?: ProcurementRequestStatus
  tenantId: string
}) {
  return {
    tenantId: input.tenantId,
    ...(input.memberId ? { memberId: input.memberId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.search && {
      OR: [
        {
          itemName: {
            contains: input.search,
            mode: "insensitive" as const,
          },
        },
        {
          vendorName: {
            contains: input.search,
            mode: "insensitive" as const,
          },
        },
        {
          member: {
            is: {
              OR: [
                {
                  fullName: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  memberNumber: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  email: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          },
        },
      ],
    }),
  }
}

export async function listProcurementRequestPage(
  input: {
    tenantId: string
  } & ListProcurementRequestPageFilters,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (input.status && !procurementRequestStatuses.has(input.status)) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Procurement request status is not supported.",
    })
  }

  const pageSize = input.pageSize ?? input.limit ?? 50
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Procurement page size must be a positive whole number.",
    })
  }

  const where = getProcurementRequestWhere(input)
  const cursor = input.cursor
    ? decodeProcurementRequestPageCursor(input.cursor, input.sort)
    : null
  const pageWhere: any = cursor
    ? {
        AND: [
          where,
          getProcurementRequestPageKeysetWhere({ cursor, sort: input.sort }),
        ],
      }
    : where
  const [requests, total] = await Promise.all([
    prisma.procurementRequest.findMany({
      include: procurementInclude(),
      orderBy: getProcurementRequestOrderBy(input.sort),
      ...(cursor ? {} : { skip: ((input.page ?? 1) - 1) * pageSize }),
      take: pageSize + 1,
      where: pageWhere,
    }),
    prisma.procurementRequest.count({ where }),
  ])

  const data = requests
    .slice(0, pageSize)
    .map((request: any) => normalizeProcurementRequest(request))

  return {
    data,
    meta: {
      cursor:
        requests.length > pageSize
          ? data.at(-1)
            ? createProcurementRequestPageCursor(data.at(-1)!, input.sort)
            : undefined
          : undefined,
      total,
    },
  }
}

export async function getProcurementSummary(
  tenantId: string,
  prismaOverride?: PrismaClient,
  memberId?: string
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
      totalRequests: 0,
      totalApprovedCost: 0,
      totalRequestedCost: 0,
    }
  }

  const today = startOfDayUtc(new Date())
  const tomorrow = addDaysUtc(today, 1)
  const requestScope = { tenantId, ...(memberId ? { memberId } : {}) }
  const scheduleScope = { tenantId, ...(memberId ? { memberId } : {}) }
  const [
    totalRequests,
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
    prisma.procurementRequest.count({ where: requestScope }),
    prisma.procurementRequest.count({
      where: {
        ...requestScope,
        status: { in: [...pendingProcurementStatuses] },
      },
    }),
    prisma.procurementRequest.count({
      where: { ...requestScope, status: "approved" },
    }),
    prisma.procurementRequest.count({
      where: { ...requestScope, status: "rejected" },
    }),
    prisma.procurementRequest.count({
      where: {
        ...requestScope,
        status: { in: ["purchased", "active"] },
      },
    }),
    prisma.procurementRepaymentScheduleItem.count({
      where: {
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: [...payableScheduleStatuses] },
        ...scheduleScope,
      },
    }),
    prisma.procurementRepaymentScheduleItem.count({
      where: {
        dueDate: { lt: today },
        status: { in: [...payableScheduleStatuses] },
        ...scheduleScope,
      },
    }),
    prisma.procurementRepaymentScheduleItem.aggregate({
      _sum: { amount: true, paidAmount: true },
      where: {
        status: { in: [...payableScheduleStatuses] },
        ...scheduleScope,
      },
    }),
    prisma.procurementRequest.aggregate({
      _sum: { requestedCost: true },
      where: requestScope,
    }),
    prisma.procurementRequest.aggregate({
      _sum: { approvedCost: true },
      where: {
        ...requestScope,
        status: { in: ["approved", "purchased", "active"] },
      },
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
    totalRequests,
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
    requestSource?: ProcurementRequestSource
    requestedCost: number
    requestedRepaymentMonths: number
    submissionKey?: string | null
    tenantId: string
    vendorName?: string | null
  },
  prismaOverride?: PrismaClient
): Promise<ProcurementRequestRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  if (
    input.submissionKey &&
    typeof prisma.procurementRequest?.findFirst === "function"
  ) {
    const existingRequest = await prisma.procurementRequest.findFirst({
      include: procurementInclude(),
      where: {
        createdByUserId: input.actorUserId,
        memberId: input.memberId,
        submissionKey: input.submissionKey,
        tenantId: input.tenantId,
      },
    })
    if (existingRequest) return normalizeProcurementRequest(existingRequest)
  }

  const itemName = trimRequired(input.itemName, "Procurement item")
  assertPositiveAmount(input.requestedCost, "Requested cost")
  assertPositiveInteger(
    input.requestedRepaymentMonths,
    "Requested repayment months"
  )

  const [member, policy, operationProfile] = await Promise.all([
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
    getTenantOperationProfile(input.tenantId, prisma as PrismaClient),
  ])
  const procurementCapability = operationProfile.services.procurement

  assertProcurementRequestCreationAllowed({
    accessMode: procurementCapability.accessMode,
    canMemberCreate: procurementCapability.canMemberCreate,
    canStaffCreate: procurementCapability.canStaffCreate,
    requestSource: input.requestSource ?? "staff",
  })

  if (!member) {
    throw new AppError({
      code: "NOT_FOUND",
      publicMessage: "Member does not belong to this cooperative.",
    })
  }

  const procurementMaximumPaybackMonths = Number(
    policy?.procurementMaximumPaybackMonths ?? 12
  )

  if (input.requestedRepaymentMonths > procurementMaximumPaybackMonths) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: `Requested procurement repayment months cannot exceed ${procurementMaximumPaybackMonths}.`,
    })
  }

  const procurementMaximumActiveObligationsPerMember = Number(
    policy?.procurementMaximumActiveObligationsPerMember ?? 1
  )
  assertPositiveInteger(
    procurementMaximumActiveObligationsPerMember,
    "Procurement active obligation limit"
  )
  const activeProcurementObligationCount =
    await prisma.procurementRequest.count({
      where: {
        memberId: input.memberId,
        repaymentScheduleItems: {
          some: {
            status: { notIn: ["paid", "waived"] },
          },
        },
        status: { in: [...activeProcurementObligationStatuses] },
        tenantId: input.tenantId,
      },
    })

  if (
    activeProcurementObligationCount >=
    procurementMaximumActiveObligationsPerMember
  ) {
    throw new AppError({
      code: "PRECONDITION_FAILED",
      publicMessage: `This member has reached the active procurement obligation limit (${procurementMaximumActiveObligationsPerMember}). Settle an active procurement obligation before creating another request.`,
    })
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
      throw new AppError({
        code: "PRECONDITION_FAILED",
        publicMessage:
          "This cooperative blocks procurement while the member has active financing.",
      })
    }
  }

  const estimatedMonthlyRepayment = calculateMonthlyRepayment(
    input.requestedCost,
    input.requestedRepaymentMonths
  )

  try {
    return await prisma.$transaction(async (tx: any) => {
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
          submissionKey: input.submissionKey ?? null,
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

      await applyApplicableWorkflowChargesInTransaction(
        {
          actorUserId: input.actorUserId,
          assessedAt: request.requestedAt,
          basisAmount: Number(request.requestedCost),
          memberId: request.memberId,
          notes: "Automatically applied for procurement request submission.",
          procurementRequestId: request.id,
          tenantId: input.tenantId,
          trigger: "submission",
          workflow: "procurement_request",
        },
        tx as PrismaClient
      )

      return normalizeProcurementRequest(request)
    })
  } catch (error) {
    if (!input.submissionKey || !isUniqueConstraintError(error)) throw error

    const existingRequest = await prisma.procurementRequest.findFirst({
      include: procurementInclude(),
      where: {
        createdByUserId: input.actorUserId,
        memberId: input.memberId,
        submissionKey: input.submissionKey,
        tenantId: input.tenantId,
      },
    })
    if (existingRequest) return normalizeProcurementRequest(existingRequest)

    throw ExpectedQueryError.conflict(
      "This procurement submission key has already been used."
    )
  }
}

export async function reviewProcurementRequest(
  input: {
    actorUserId: string
    approvedCost?: number | null
    approvedRepaymentMonths?: number | null
    expectedStatus?: ProcurementRequestStatus
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
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Procurement request status is not supported.",
    })
  }

  return prisma.$transaction(async (tx: any) => {
    const existingRequest = await readProcurementRequest(
      {
        procurementRequestId: input.procurementRequestId,
        tenantId: input.tenantId,
      },
      tx
    )
    if (
      input.expectedStatus &&
      existingRequest.status !== input.expectedStatus
    ) {
      throw ExpectedQueryError.conflict(
        `Procurement request changed from ${input.expectedStatus} to ${existingRequest.status}. Refresh before reviewing.`
      )
    }
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
        throw new AppError({
          code: "VALIDATION_FAILED",
          publicMessage: `Approved procurement repayment months cannot exceed ${procurementMaximumPaybackMonths}.`,
        })
      }

      approvedMonthlyRepayment = calculateMonthlyRepayment(
        approvedRequestCost,
        approvedRequestRepaymentMonths
      )
    }

    const claim = await tx.procurementRequest.updateMany({
      where: {
        id: existingRequest.id,
        status: existingRequest.status,
        tenantId: input.tenantId,
      },
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
    })

    if (claim.count !== 1) {
      throw ExpectedQueryError.conflict(
        "Procurement request changed during review. Refresh before retrying."
      )
    }

    const request = await tx.procurementRequest.findFirst({
      include: procurementInclude(),
      where: { id: existingRequest.id, tenantId: input.tenantId },
    })
    if (!request) {
      throw ExpectedQueryError.notFound("Procurement request was not found.")
    }

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

    if (input.status === "approved") {
      await applyApplicableWorkflowChargesInTransaction(
        {
          actorUserId: input.actorUserId,
          assessedAt: request.reviewedAt ?? new Date(),
          basisAmount: Number(request.approvedCost ?? request.requestedCost),
          memberId: request.memberId,
          notes: "Automatically applied for procurement request approval.",
          procurementRequestId: request.id,
          tenantId: input.tenantId,
          trigger: "approval",
          workflow: "procurement_request",
        },
        tx as PrismaClient
      )
    }

    return normalizeProcurementRequest(request)
  })
}

export async function recordProcurementPurchase(
  input: {
    actorUserId: string
    expectedStatus?: ProcurementRequestStatus
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
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage:
        "First procurement repayment due date cannot be before the purchase date.",
    })
  }

  return prisma.$transaction(async (tx: any) => {
    const existingRequest = await readProcurementRequest(
      {
        procurementRequestId: input.procurementRequestId,
        tenantId: input.tenantId,
      },
      tx
    )

    if (
      input.expectedStatus &&
      existingRequest.status !== input.expectedStatus
    ) {
      throw ExpectedQueryError.conflict(
        `Procurement request changed from ${input.expectedStatus} to ${existingRequest.status}. Refresh before recording the purchase.`
      )
    }

    if (existingRequest.status !== "approved") {
      throw new AppError({
        code: "CONFLICT",
        publicMessage:
          "Only approved procurement requests can be marked purchased.",
      })
    }

    const approvedCost = Number(existingRequest.approvedCost ?? 0)
    const approvedRepaymentMonths = existingRequest.approvedRepaymentMonths

    if (approvedCost <= 0 || !approvedRepaymentMonths) {
      throw new AppError({
        code: "PRECONDITION_FAILED",
        publicMessage:
          "Approved procurement cost and repayment months are required before purchase.",
      })
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
      throw new AppError({
        code: "CONFLICT",
        publicMessage:
          "This procurement request already has a repayment schedule.",
      })
    }

    const scheduleAmounts = buildScheduleAmounts(
      approvedCost,
      approvedRepaymentMonths
    )

    const claim = await tx.procurementRequest.updateMany({
      data: {
        purchaseNotes,
        purchaseReference,
        purchasedAt: purchaseDate,
        purchasedByUserId: input.actorUserId,
        status: "active",
      },
      where: {
        id: existingRequest.id,
        status: existingRequest.status,
        tenantId: input.tenantId,
      },
    })

    if (claim.count !== 1) {
      throw ExpectedQueryError.conflict(
        "Procurement request changed during purchase activation. Refresh before retrying."
      )
    }

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
        entityId: existingRequest.id,
        entityType: "ProcurementRequest",
        metadata: {
          approvedCost,
          approvedRepaymentMonths,
          firstDueDate: firstDueDate.toISOString(),
          memberId: existingRequest.memberId,
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
      ...existingRequest,
      purchaseNotes,
      purchaseReference,
      purchasedAt: purchaseDate,
      purchasedByUserId: input.actorUserId,
      status: "active",
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
