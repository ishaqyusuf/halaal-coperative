import type {
  PrismaClient,
  RepaymentScheduleStatus,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError, QueryInfrastructureError } from "../query-error"
import {
  applyLoanRequestChargesInTransaction,
  getApplicableChargeQuoteHash,
  quoteApplicableCharges,
  type ChargeQuote,
} from "./charges"
import { getDashboardMetrics } from "./dashboard"
import {
  assertLoanRequestIntakeCapacity,
  getDeployableFundsSnapshot,
  getMonthlyFinancingCycleHealth,
} from "./financing-cycles"
import { getLedgerAccountByCode, postLedgerTransaction } from "./ledger"
import { getTenantInitialMigrationState } from "./migration"

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

function normalizePositiveMoney(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw ExpectedQueryError.validation(
      `${label} must be a positive finite amount.`
    )
  }

  if (Math.round(value * 100) / 100 !== value) {
    throw ExpectedQueryError.validation(
      `${label} must not have more than two decimal places.`
    )
  }

  return value
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw ExpectedQueryError.validation(
      `${label} must be a positive whole number.`
    )
  }
}

async function runSerializableTransactionWithRetry<T>(
  prisma: PrismaClient,
  callback: (tx: PrismaClient) => Promise<T>,
  failureMessage: string
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return (await prisma.$transaction(callback as never, {
        isolationLevel: "Serializable",
        maxWait: 5_000,
        timeout: 15_000,
      })) as T
    } catch (error) {
      if (
        (error as { code?: string } | null)?.code !== "P2034" ||
        attempt === 3
      ) {
        throw error
      }
    }
  }

  throw new QueryInfrastructureError(failureMessage)
}

type PlainLoanValue<T> = T extends Date
  ? T
  : T extends { toNumber(): number }
    ? number
    : T extends readonly (infer TValue)[]
      ? PlainLoanValue<TValue>[]
      : T extends object
        ? { [TKey in keyof T]: PlainLoanValue<T[TKey]> }
        : T

function isPrismaDecimal(value: unknown): value is { toNumber(): number } {
  if (!value || typeof value !== "object") return false

  const candidate = value as {
    d?: unknown
    e?: unknown
    s?: unknown
    toNumber?: unknown
  }

  return (
    Array.isArray(candidate.d) &&
    typeof candidate.e === "number" &&
    typeof candidate.s === "number" &&
    typeof candidate.toNumber === "function"
  )
}

/**
 * Prisma Decimal instances cannot cross the React Server Component hydration
 * boundary. Keep dates intact for SuperJSON and recursively normalize only
 * Decimal values to the numeric DTO contract used by the dashboard.
 */
export function toPlainLoanDto<T>(value: T): PlainLoanValue<T> {
  if (value instanceof Date) return value as PlainLoanValue<T>
  if (isPrismaDecimal(value)) return value.toNumber() as PlainLoanValue<T>
  if (Array.isArray(value)) {
    return value.map((item) => toPlainLoanDto(item)) as PlainLoanValue<T>
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toPlainLoanDto(item)])
    ) as PlainLoanValue<T>
  }

  return value as PlainLoanValue<T>
}

export async function listLoanProducts(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const products = await prisma.loanProduct.findMany({
    where: { tenantId, isActive: true },
    orderBy: { termMonths: "asc" },
  })

  return toPlainLoanDto(products)
}

export async function listLoanRequests(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const requests = await prisma.loanRequest.findMany({
    where: { tenantId },
    include: {
      loanProduct: true,
      member: { select: { id: true, fullName: true, memberNumber: true } },
      charges: {
        include: {
          chargeDefinition: {
            select: {
              code: true,
              name: true,
            },
          },
        },
        orderBy: { assessedAt: "asc" },
      },
      approvals: {
        orderBy: { actedAt: "desc" },
        include: {
          actorUser: { select: { id: true, fullName: true, email: true } },
        },
      },
      guarantorApprovals: {
        orderBy: { requestedAt: "asc" },
        include: {
          guarantorMember: {
            select: {
              email: true,
              fullName: true,
              id: true,
              memberNumber: true,
            },
          },
          respondedByUser: {
            select: { id: true, fullName: true, email: true },
          },
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  })

  return toPlainLoanDto(requests)
}

export type LoanListPageInput = {
  cursor?: string | null
  memberId?: string
  pageSize?: number
  q?: string
  sort?: [string, "asc" | "desc"] | null
  status?: string
}

type LoanListCursor = {
  direction: "asc" | "desc"
  field: string
  id: string
  value: string
}

function decodeLoanListCursor(cursor?: string | null): LoanListCursor | null {
  if (!cursor) return null

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    if (
      typeof parsed?.id !== "string" ||
      typeof parsed?.value !== "string" ||
      typeof parsed?.field !== "string" ||
      (parsed?.direction !== "asc" && parsed?.direction !== "desc")
    ) {
      throw ExpectedQueryError.validation("Invalid cursor")
    }
    return parsed
  } catch {
    throw ExpectedQueryError.validation("Loan list cursor is invalid.")
  }
}

function encodeLoanListCursor(cursor: LoanListCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url")
}

function normalizedLoanPageSize(pageSize?: number) {
  if (pageSize === undefined) return 50
  assertPositiveInteger(pageSize, "Loan list page size")
  if (pageSize > 100) {
    throw ExpectedQueryError.validation(
      "Loan list page size cannot exceed 100."
    )
  }
  return pageSize
}

function assertMatchingLoanCursor(
  cursor: LoanListCursor | null,
  field: string,
  direction: "asc" | "desc"
) {
  if (cursor && (cursor.field !== field || cursor.direction !== direction)) {
    throw ExpectedQueryError.validation(
      "Loan list cursor does not match the requested sort."
    )
  }
}

function loanCursorComparison(direction: "asc" | "desc") {
  return direction === "asc" ? "gt" : "lt"
}

export function toMemberSafeLoanRequest<
  T extends {
    approvals?: unknown
    charges?: unknown
    guarantorApprovals?: unknown
    member?: { fullName: string; id: string; memberNumber: string }
  },
>(row: T) {
  const {
    approvals: _approvals,
    charges: _charges,
    guarantorApprovals: _guarantors,
    ...safe
  } = row
  return safe
}

export function toMemberSafeLoan<
  T extends {
    member?: { fullName: string; id: string; memberNumber: string }
  },
>(row: T) {
  const { member: _member, ...safe } = row
  return safe
}

export async function listLoanRequestsPage(
  tenantId: string,
  input: LoanListPageInput = {},
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const pageSize = normalizedLoanPageSize(input.pageSize)
  const cursor = decodeLoanListCursor(input.cursor)
  const [sortField, sortDirection] = input.sort ?? ["requestedAt", "desc"]
  const supportedSortFields = new Set(["memberName", "requestedAt", "status"])
  if (!supportedSortFields.has(sortField)) {
    throw ExpectedQueryError.validation("Loan request sort is invalid.")
  }
  assertMatchingLoanCursor(cursor, sortField, sortDirection)
  const comparison = loanCursorComparison(sortDirection)
  const cursorDate = cursor ? new Date(cursor.value) : null
  const cursorWhere = cursor
    ? sortField === "memberName"
      ? {
          OR: [
            { member: { fullName: { [comparison]: cursor.value } } },
            {
              id: { [comparison]: cursor.id },
              member: { fullName: cursor.value },
            },
          ],
        }
      : sortField === "status"
        ? {
            OR: [
              { status: { [comparison]: cursor.value } },
              { id: { [comparison]: cursor.id }, status: cursor.value },
            ],
          }
        : {
            OR: [
              { requestedAt: { [comparison]: cursorDate } },
              {
                id: { [comparison]: cursor.id },
                requestedAt: cursorDate,
              },
            ],
          }
    : {}
  const where: any = {
    tenantId,
    ...(input.memberId ? { memberId: input.memberId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.q
      ? {
          member: {
            OR: [
              { fullName: { contains: input.q, mode: "insensitive" } },
              { memberNumber: { contains: input.q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
    ...cursorWhere,
  }
  const orderBy: any[] =
    sortField === "memberName"
      ? [{ member: { fullName: sortDirection } }, { id: sortDirection }]
      : sortField === "status"
        ? [{ status: sortDirection }, { id: sortDirection }]
        : [{ requestedAt: sortDirection }, { id: sortDirection }]
  const rows = await prisma.loanRequest.findMany({
    where,
    include: {
      charges: {
        include: {
          chargeDefinition: {
            select: {
              code: true,
              name: true,
            },
          },
        },
        orderBy: { assessedAt: "asc" },
      },
      approvals: {
        orderBy: { actedAt: "desc" },
        select: {
          action: true,
          actedAt: true,
          actorUser: { select: { fullName: true } },
          id: true,
          notes: true,
        },
      },
      guarantorApprovals: {
        orderBy: { requestedAt: "asc" },
        select: {
          guarantorMember: {
            select: { fullName: true, id: true, memberNumber: true },
          },
          id: true,
          requestedAt: true,
          respondedAt: true,
          respondedByUser: { select: { fullName: true } },
          responseNotes: true,
          status: true,
        },
      },
      loanProduct: true,
      member: { select: { id: true, fullName: true, memberNumber: true } },
    },
    orderBy,
    take: pageSize + 1,
  })
  const hasNextPage = rows.length > pageSize
  const data = hasNextPage ? rows.slice(0, pageSize) : rows
  const last = data.at(-1)
  return {
    data: toPlainLoanDto(data),
    meta: {
      cursor:
        hasNextPage && last
          ? encodeLoanListCursor({
              id: last.id,
              direction: sortDirection,
              field: sortField,
              value:
                sortField === "memberName"
                  ? last.member.fullName
                  : sortField === "status"
                    ? last.status
                    : last.requestedAt.toISOString(),
            })
          : null,
      hasNextPage,
    },
  }
}

/** Detail query intentionally selects no staff/guarantor email fields and can be
 * constrained to the authenticated member for self-service deep links. */
export async function getLoanRequestDetail(
  input: { id: string; memberId?: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const request = await prisma.loanRequest.findFirst({
    where: {
      id: input.id,
      tenantId: input.tenantId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
    },
    include: {
      loanProduct: true,
      member: { select: { id: true, fullName: true, memberNumber: true } },
      charges: {
        include: { chargeDefinition: { select: { code: true, name: true } } },
        orderBy: { assessedAt: "asc" },
      },
      guarantorApprovals: {
        orderBy: { requestedAt: "asc" },
        select: {
          id: true,
          guarantorMemberId: true,
          requestedAt: true,
          respondedAt: true,
          responseNotes: true,
          status: true,
          guarantorMember: {
            select: { id: true, fullName: true, memberNumber: true },
          },
        },
      },
    },
  })

  return toPlainLoanDto(request)
}

export async function listMemberLoanGuarantorApprovals(
  input: {
    guarantorMemberId: string
    status?: "approved" | "pending" | "rejected"
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const approvals = await prisma.loanGuarantorApproval.findMany({
    where: {
      guarantorMemberId: input.guarantorMemberId,
      tenantId: input.tenantId,
      ...(input.status ? { status: input.status } : {}),
    },
    include: {
      loanRequest: {
        include: {
          loanProduct: true,
          member: {
            select: {
              fullName: true,
              id: true,
              memberNumber: true,
            },
          },
        },
      },
      requestedByUser: { select: { id: true, fullName: true, email: true } },
      respondedByUser: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
  })

  return toPlainLoanDto(approvals)
}

export async function listLoans(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const loans = await prisma.loan.findMany({
    where: { tenantId },
    include: {
      member: { select: { id: true, fullName: true, memberNumber: true } },
      loanProduct: true,
      loanRequest: true,
      repaymentScheduleItems: {
        orderBy: { installmentNumber: "asc" },
        take: 3,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return toPlainLoanDto(loans)
}

export async function listLoansPage(
  tenantId: string,
  input: LoanListPageInput = {},
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const pageSize = normalizedLoanPageSize(input.pageSize)
  const cursor = decodeLoanListCursor(input.cursor)
  const [sortField, sortDirection] = input.sort ?? ["createdAt", "desc"]
  const supportedSortFields = new Set([
    "createdAt",
    "estimatedMonthlyServicing",
    "loanProductName",
    "memberName",
    "status",
  ])
  if (!supportedSortFields.has(sortField)) {
    throw ExpectedQueryError.validation("Loan portfolio sort is invalid.")
  }
  assertMatchingLoanCursor(cursor, sortField, sortDirection)
  const comparison = loanCursorComparison(sortDirection)
  const cursorWhere = cursor
    ? sortField === "memberName"
      ? {
          OR: [
            { member: { fullName: { [comparison]: cursor.value } } },
            {
              id: { [comparison]: cursor.id },
              member: { fullName: cursor.value },
            },
          ],
        }
      : sortField === "loanProductName"
        ? {
            OR: [
              { loanProduct: { name: { [comparison]: cursor.value } } },
              {
                id: { [comparison]: cursor.id },
                loanProduct: { name: cursor.value },
              },
            ],
          }
        : sortField === "status"
          ? {
              OR: [
                { status: { [comparison]: cursor.value } },
                { id: { [comparison]: cursor.id }, status: cursor.value },
              ],
            }
          : sortField === "estimatedMonthlyServicing"
            ? {
                OR: [
                  {
                    estimatedMonthlyServicing: {
                      [comparison]: cursor.value,
                    },
                  },
                  {
                    estimatedMonthlyServicing: cursor.value,
                    id: { [comparison]: cursor.id },
                  },
                ],
              }
            : {
                OR: [
                  { createdAt: { [comparison]: new Date(cursor.value) } },
                  {
                    createdAt: new Date(cursor.value),
                    id: { [comparison]: cursor.id },
                  },
                ],
              }
    : {}
  const where: any = {
    tenantId,
    ...(input.memberId ? { memberId: input.memberId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.q
      ? {
          member: {
            OR: [
              { fullName: { contains: input.q, mode: "insensitive" } },
              { memberNumber: { contains: input.q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
    ...cursorWhere,
  }
  const orderBy: any[] =
    sortField === "memberName"
      ? [{ member: { fullName: sortDirection } }, { id: sortDirection }]
      : sortField === "loanProductName"
        ? [{ loanProduct: { name: sortDirection } }, { id: sortDirection }]
        : sortField === "status"
          ? [{ status: sortDirection }, { id: sortDirection }]
          : sortField === "estimatedMonthlyServicing"
            ? [
                { estimatedMonthlyServicing: sortDirection },
                { id: sortDirection },
              ]
            : [{ createdAt: sortDirection }, { id: sortDirection }]
  const rows = await prisma.loan.findMany({
    where,
    include: {
      loanProduct: true,
      member: { select: { id: true, fullName: true, memberNumber: true } },
      repaymentScheduleItems: {
        orderBy: { installmentNumber: "asc" },
        take: 3,
      },
    },
    orderBy,
    take: pageSize + 1,
  })
  const hasNextPage = rows.length > pageSize
  const data = hasNextPage ? rows.slice(0, pageSize) : rows
  const last = data.at(-1)
  return {
    data: toPlainLoanDto(data),
    meta: {
      cursor:
        hasNextPage && last
          ? encodeLoanListCursor({
              id: last.id,
              direction: sortDirection,
              field: sortField,
              value:
                sortField === "memberName"
                  ? last.member.fullName
                  : sortField === "loanProductName"
                    ? last.loanProduct.name
                    : sortField === "status"
                      ? last.status
                      : sortField === "estimatedMonthlyServicing"
                        ? last.estimatedMonthlyServicing.toString()
                        : last.createdAt.toISOString(),
            })
          : null,
      hasNextPage,
    },
  }
}

/** Tenant and optional member constraint prevent deep-link detail scans/leaks. */
export async function getLoanDetail(
  input: { id: string; memberId?: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const loan = await prisma.loan.findFirst({
    where: {
      id: input.id,
      tenantId: input.tenantId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
    },
    include: {
      loanProduct: true,
      member: { select: { id: true, fullName: true, memberNumber: true } },
      loanRequest: {
        select: {
          id: true,
          purpose: true,
          requestedAt: true,
          requestedAmount: true,
          requestedTermMonths: true,
          status: true,
        },
      },
      repaymentScheduleItems: { orderBy: { installmentNumber: "asc" } },
      repayments: { orderBy: { paidAt: "desc" } },
    },
  })

  return toPlainLoanDto(loan)
}

export async function listMemberLoans(
  input: {
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const loans = await prisma.loan.findMany({
    include: {
      loanProduct: true,
      loanRequest: true,
      member: { select: { fullName: true, id: true, memberNumber: true } },
      repaymentScheduleItems: {
        orderBy: { installmentNumber: "asc" },
        take: 3,
      },
    },
    orderBy: { createdAt: "desc" },
    where: {
      memberId: input.memberId,
      tenantId: input.tenantId,
    },
  })

  return toPlainLoanDto(loans)
}

export async function listRepayments(
  tenantId: string,
  input?: {
    fromDate?: Date
    loanId?: string
    memberId?: string
    limit?: number
    status?: RepaymentScheduleStatus | "posted" | "reversed" | "pending"
    toDate?: Date
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.repayment.findMany({
    where: {
      tenantId,
      ...(input?.memberId ? { memberId: input.memberId } : {}),
      ...(input?.loanId ? { loanId: input.loanId } : {}),
      ...(input?.status &&
      ["posted", "reversed", "pending"].includes(input.status)
        ? { status: input.status as "posted" | "reversed" | "pending" }
        : {}),
      ...(input?.fromDate || input?.toDate
        ? {
            paidAt: {
              ...(input?.fromDate ? { gte: input.fromDate } : {}),
              ...(input?.toDate ? { lte: input.toDate } : {}),
            },
          }
        : {}),
    },
    include: {
      member: { select: { id: true, fullName: true, memberNumber: true } },
      loan: {
        include: {
          loanProduct: true,
        },
      },
      repaymentScheduleItem: true,
    },
    orderBy: { paidAt: "desc" },
  })
}

export async function listRepaymentScheduleItems(
  tenantId: string,
  input?: {
    assignedToUserId?: string
    fromDate?: Date
    limit?: number
    memberId?: string
    resolutionStatus?: string
    stage?: string
    status?: RepaymentScheduleStatus
    toDate?: Date
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.repaymentScheduleItem.findMany({
    where: {
      tenantId,
      ...(input?.status ? { status: input.status } : {}),
      ...(input?.assignedToUserId
        ? {
            collectionFollowUps: {
              some: {
                assignedToUserId: input.assignedToUserId,
              },
            },
          }
        : {}),
      ...(input?.resolutionStatus
        ? {
            collectionFollowUps: {
              some: {
                resolutionStatus: input.resolutionStatus,
              },
            },
          }
        : {}),
      ...(input?.stage
        ? {
            collectionFollowUps: {
              some: {
                caseStage: input.stage,
              },
            },
          }
        : {}),
      ...(input?.fromDate || input?.toDate
        ? {
            dueAt: {
              ...(input?.fromDate ? { gte: input.fromDate } : {}),
              ...(input?.toDate ? { lte: input.toDate } : {}),
            },
          }
        : {}),
      ...(input?.memberId
        ? {
            loan: {
              memberId: input.memberId,
            },
          }
        : {}),
    },
    include: {
      loan: {
        include: {
          member: { select: { id: true, fullName: true, memberNumber: true } },
          loanProduct: true,
        },
      },
      collectionFollowUps: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          actorUser: { select: { id: true, fullName: true, email: true } },
          assignedToUser: { select: { id: true, fullName: true, email: true } },
        },
      },
    },
    orderBy: [{ dueAt: "asc" }, { installmentNumber: "asc" }],
    ...(input?.limit ? { take: input.limit } : {}),
  })
}

export async function listCollectionFollowUps(
  tenantId: string,
  input?: {
    assignedToUserId?: string
    fromDate?: Date
    limit?: number
    memberId?: string
    resolutionStatus?: string
    stage?: string
    status?: string
    toDate?: Date
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  return prisma.collectionFollowUp.findMany({
    where: {
      tenantId,
      ...(input?.memberId ? { memberId: input.memberId } : {}),
      ...(input?.assignedToUserId
        ? { assignedToUserId: input.assignedToUserId }
        : {}),
      ...(input?.resolutionStatus
        ? { resolutionStatus: input.resolutionStatus }
        : {}),
      ...(input?.stage ? { caseStage: input.stage } : {}),
      ...(input?.status ? { status: input.status } : {}),
      ...(input?.fromDate || input?.toDate
        ? {
            createdAt: {
              ...(input?.fromDate ? { gte: input.fromDate } : {}),
              ...(input?.toDate ? { lte: input.toDate } : {}),
            },
          }
        : {}),
    },
    include: {
      actorUser: { select: { id: true, fullName: true, email: true } },
      assignedToUser: { select: { id: true, fullName: true, email: true } },
      loan: {
        include: {
          loanProduct: true,
          member: { select: { id: true, fullName: true, memberNumber: true } },
        },
      },
      member: { select: { id: true, fullName: true, memberNumber: true } },
      repaymentScheduleItem: true,
    },
    orderBy: { createdAt: "desc" },
    take: input?.limit ?? 25,
  })
}

export async function getCollectionFollowUpSummary(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const [
    total,
    reminded,
    promiseToPay,
    unreachable,
    settled,
    dueNext,
    activeCases,
    resolvedCases,
    highPriority,
  ] = await Promise.all([
    prisma.collectionFollowUp.count({ where: { tenantId } }),
    prisma.collectionFollowUp.count({
      where: { tenantId, status: "reminded" },
    }),
    prisma.collectionFollowUp.count({
      where: { tenantId, status: "promise_to_pay" },
    }),
    prisma.collectionFollowUp.count({
      where: { tenantId, status: "unreachable" },
    }),
    prisma.collectionFollowUp.count({ where: { tenantId, status: "settled" } }),
    prisma.collectionFollowUp.count({
      where: {
        tenantId,
        nextActionAt: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.collectionFollowUp.count({
      where: { tenantId, resolutionStatus: "open" },
    }),
    prisma.collectionFollowUp.count({
      where: { tenantId, resolutionStatus: "resolved" },
    }),
    prisma.collectionFollowUp.count({ where: { tenantId, priority: "high" } }),
  ])

  return {
    activeCases,
    dueNext,
    highPriority,
    promiseToPay,
    reminded,
    resolvedCases,
    settled,
    total,
    unreachable,
  }
}

export async function refreshCollectionsStatuses(
  input: {
    actorUserId: string
    /** Server-owned clock override for deterministic internal workflows. */
    asOf?: Date
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const today = input.asOf ?? new Date()

  return prisma.$transaction(async (tx) => {
    const result = await tx.repaymentScheduleItem.updateMany({
      where: {
        tenantId: input.tenantId,
        dueAt: { lt: today },
        status: {
          in: ["pending", "due", "partially_paid"],
        },
      },
      data: {
        status: "overdue",
      },
    })

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        actorType: "user",
        action: "collections.statuses_refreshed",
        entityType: "RepaymentScheduleItem",
        metadata: {
          updatedCount: result.count,
        },
        occurredAt: today,
      },
    })

    return result
  })
}

function calculateEstimatedMonthlyServicing(
  requestedAmount: number,
  requestedTermMonths: number
) {
  if (requestedTermMonths <= 0) {
    throw ExpectedQueryError.validation(
      "Repayment term must be at least one month."
    )
  }

  return Number((requestedAmount / requestedTermMonths).toFixed(2))
}

async function getMemberFinancingEligibilitySavingsBase(input: {
  memberId: string
  prisma: PrismaClient
  specialSavingsCountsForEligibility: boolean
  tenantId: string
  totalSavingsSnapshot: number
}) {
  if (input.specialSavingsCountsForEligibility) {
    return input.totalSavingsSnapshot
  }

  const contributions = await input.prisma.contribution.findMany({
    select: {
      amount: true,
      committedAmount: true,
      extraSavingsAmount: true,
    },
    where: {
      memberId: input.memberId,
      status: "posted",
      tenantId: input.tenantId,
    },
  })

  return contributions.reduce((total, contribution) => {
    const amount = Number(contribution.amount)
    const committedAmount =
      contribution.committedAmount !== null &&
      contribution.committedAmount !== undefined
        ? Number(contribution.committedAmount)
        : Math.max(0, amount - Number(contribution.extraSavingsAmount ?? 0))

    return total + committedAmount
  }, 0)
}

export type SubmitLoanRequestInput = {
  actorUserId: string
  /** Mobile member's reviewed charge schedule; dashboard submissions may omit it. */
  expectedChargeQuoteHash?: string
  extraMonthlySavingsAmount?: number
  guarantorMemberIds?: string[]
  loanProductId: string
  memberId: string
  purpose?: string
  /** Server-owned clock override for deterministic internal workflows. */
  requestedAt?: Date
  requestedAmount: number
  requestedTermMonths: number
  tenantId: string
}

export type LoanRequestQuote = {
  availablePool: number
  blockers: { key: string; message: string }[]
  canSubmit: boolean
  capacityRemaining: number
  charges: {
    amount: number
    chargeValueType: "fixed_amount" | "percentage"
    code: string
    collectionMode: string
    id: string
    isRequired: boolean
    name: string
  }[]
  chargeQuoteHash: string
  deployableFunds: number
  eligibleAmount: number
  eligibilitySavingsBase: number
  estimatedMonthlyServicing: number
  feeTotal: number
  generatedAt: string
  product: {
    code: string | null
    id: string
    loanType: string
    maxSavingsMultiple: number
    name: string
    termMonths: number
  }
  requestedAmount: number
  requestedTermMonths: number
  specialSavingsCountsForEligibility: boolean
  warnings: { key: string; message: string }[]
}

export function getLoanRequestChargeQuoteHash(
  charges: ChargeQuote[],
  requestedAmount: number
) {
  return getApplicableChargeQuoteHash(charges, requestedAmount)
}

export async function quoteLoanRequest(
  input: Omit<SubmitLoanRequestInput, "actorUserId" | "guarantorMemberIds">,
  prismaOverride?: PrismaClient
): Promise<LoanRequestQuote> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const requestedAmount = normalizePositiveMoney(
    input.requestedAmount,
    "Requested amount"
  )
  assertPositiveInteger(input.requestedTermMonths, "Requested repayment term")
  const assessedAt = new Date()

  const [
    member,
    product,
    policy,
    metrics,
    cycleHealth,
    charges,
    migrationState,
  ] = await Promise.all([
    prisma.member.findFirst({
      where: { id: input.memberId, tenantId: input.tenantId },
    }),
    prisma.loanProduct.findFirst({
      where: {
        id: input.loanProductId,
        isActive: true,
        tenantId: input.tenantId,
      },
    }),
    prisma.tenantPolicy.findUnique({
      where: { tenantId: input.tenantId },
    }),
    getDashboardMetrics(input.tenantId, prisma),
    getMonthlyFinancingCycleHealth({ tenantId: input.tenantId }, prisma),
    quoteApplicableCharges(
      {
        assessedAt,
        basisAmount: requestedAmount,
        tenantId: input.tenantId,
        trigger: "submission",
        workflow: "loan_request",
      },
      prisma
    ),
    getTenantInitialMigrationState(input.tenantId, prisma),
  ])

  if (!member) throw ExpectedQueryError.notFound("Member not found")
  if (!product) throw ExpectedQueryError.notFound("Loan product not found")

  const specialSavingsCountsForEligibility =
    policy?.specialSavingsCountsForEligibility ?? true
  const eligibilitySavingsBase = await getMemberFinancingEligibilitySavingsBase(
    {
      memberId: input.memberId,
      prisma,
      specialSavingsCountsForEligibility,
      tenantId: input.tenantId,
      totalSavingsSnapshot: Number(member.totalSavingsSnapshot),
    }
  )
  const policyMultiple = Number(policy?.loanEligibilityMultiple ?? 2)
  const productMultiple = Number(product.maxSavingsMultiple)
  const eligibleAmount =
    eligibilitySavingsBase * Math.min(policyMultiple, productMultiple)
  const estimatedMonthlyServicing = calculateEstimatedMonthlyServicing(
    requestedAmount,
    input.requestedTermMonths
  )
  const activeFinancingCount =
    product.loanType === "quick"
      ? await prisma.loan.count({
          where: {
            memberId: input.memberId,
            status: { in: ["approved", "disbursed", "active"] },
            tenantId: input.tenantId,
          },
        })
      : 0
  const capacity = cycleHealth[product.loanType]
  const blockers: LoanRequestQuote["blockers"] = []
  const warnings: LoanRequestQuote["warnings"] = cycleHealth.warnings.map(
    (warning) => ({ key: warning.key, message: warning.label })
  )

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    blockers.push({
      key: "financial_writes_locked",
      message:
        "Financing requests are locked until initial migration is finalized.",
    })
  }
  if (input.requestedTermMonths > product.termMonths) {
    blockers.push({
      key: "term_exceeds_product",
      message: `Requested term exceeds the product limit of ${product.termMonths} months.`,
    })
  }
  if (requestedAmount > eligibleAmount) {
    blockers.push({
      key: "eligibility_exceeded",
      message: "Requested amount exceeds the member eligibility snapshot.",
    })
  }
  if (cycleHealth.intakeStatus !== "open") {
    blockers.push({
      key: "cycle_not_open",
      message: `Current monthly financing intake is ${cycleHealth.intakeStatus}.`,
    })
  }
  if (requestedAmount > capacity.remainingAmount) {
    blockers.push({
      key: "cycle_capacity_exceeded",
      message: `${product.loanType === "quick" ? "Quick" : "Normal"} financing allocation has ${capacity.remainingAmount.toLocaleString("en-NG")} remaining for this cycle.`,
    })
  }
  if (
    product.loanType === "quick" &&
    activeFinancingCount > 0 &&
    (policy?.activeFinancingBlocksEmergency ?? true)
  ) {
    blockers.push({
      key: "active_financing_overlap",
      message:
        "This cooperative blocks emergency financing while the member has active financing.",
    })
  }
  if (requestedAmount > cycleHealth.deployableFunds.deployableFunds) {
    warnings.push({
      key: "deployable_funds_below_request",
      message: `Current deployable funds are ${cycleHealth.deployableFunds.deployableFunds.toLocaleString("en-NG")}; approval or disbursement may be held.`,
    })
  }

  const mobileCharges = charges.map((charge) => ({
    amount: charge.amount,
    chargeValueType: charge.chargeValueType,
    code: charge.code,
    collectionMode: charge.collectionMode,
    id: charge.chargeApplicabilityId ?? charge.chargeDefinitionId,
    isRequired: charge.isRequired,
    name: charge.name,
  }))

  return {
    availablePool: Number(metrics.availablePool),
    blockers,
    canSubmit: blockers.length === 0,
    capacityRemaining: capacity.remainingAmount,
    charges: mobileCharges,
    chargeQuoteHash: getLoanRequestChargeQuoteHash(charges, requestedAmount),
    deployableFunds: cycleHealth.deployableFunds.deployableFunds,
    eligibleAmount,
    eligibilitySavingsBase,
    estimatedMonthlyServicing,
    feeTotal: mobileCharges.reduce((total, charge) => total + charge.amount, 0),
    generatedAt: new Date().toISOString(),
    product: {
      code: product.code,
      id: product.id,
      loanType: product.loanType,
      maxSavingsMultiple: Number(product.maxSavingsMultiple),
      name: product.name,
      termMonths: product.termMonths,
    },
    requestedAmount,
    requestedTermMonths: input.requestedTermMonths,
    specialSavingsCountsForEligibility,
    warnings,
  }
}

function normalizeLoanGuarantorMemberIds(ids?: string[]) {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (const id of ids ?? []) {
    const value = id.trim()

    if (!value || seen.has(value)) {
      continue
    }

    seen.add(value)
    normalized.push(value)
  }

  return normalized
}

export async function submitLoanRequest(
  input: SubmitLoanRequestInput,
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  const requestedAmount = normalizePositiveMoney(
    input.requestedAmount,
    "Requested amount"
  )
  assertPositiveInteger(input.requestedTermMonths, "Requested repayment term")
  const extraMonthlySavingsAmount = input.extraMonthlySavingsAmount ?? 0
  if (
    !Number.isFinite(extraMonthlySavingsAmount) ||
    extraMonthlySavingsAmount < 0 ||
    Math.round(extraMonthlySavingsAmount * 100) / 100 !==
      extraMonthlySavingsAmount
  ) {
    throw ExpectedQueryError.validation(
      "Extra monthly savings amount must be a non-negative finite amount with at most two decimal places."
    )
  }

  const [member, loanProduct, policy, metrics] = await Promise.all([
    prisma.member.findFirst({
      where: { id: input.memberId, tenantId: input.tenantId },
    }),
    prisma.loanProduct.findFirst({
      where: {
        id: input.loanProductId,
        tenantId: input.tenantId,
        isActive: true,
      },
    }),
    prisma.tenantPolicy.findUnique({
      where: { tenantId: input.tenantId },
    }),
    getDashboardMetrics(input.tenantId, prisma),
  ])

  if (!member) throw ExpectedQueryError.notFound("Member not found")
  if (!loanProduct) throw ExpectedQueryError.notFound("Loan product not found")
  if (input.requestedTermMonths > loanProduct.termMonths) {
    throw ExpectedQueryError.validation(
      `Requested term exceeds the product limit of ${loanProduct.termMonths} months.`
    )
  }

  const guarantorMemberIds = normalizeLoanGuarantorMemberIds(
    input.guarantorMemberIds
  )

  if (guarantorMemberIds.includes(input.memberId)) {
    throw ExpectedQueryError.validation(
      "A member cannot guarantee their own financing request."
    )
  }

  const guarantorMembers = guarantorMemberIds.length
    ? await prisma.member.findMany({
        where: {
          id: { in: guarantorMemberIds },
          status: "active",
          tenantId: input.tenantId,
        },
        select: {
          email: true,
          fullName: true,
          id: true,
          memberNumber: true,
        },
      })
    : []

  if (guarantorMembers.length !== guarantorMemberIds.length) {
    throw ExpectedQueryError.notFound(
      "One or more guarantor members could not be found."
    )
  }

  const specialSavingsCountsForEligibility =
    policy?.specialSavingsCountsForEligibility ?? true
  const eligibilitySavingsBase = await getMemberFinancingEligibilitySavingsBase(
    {
      memberId: input.memberId,
      prisma,
      specialSavingsCountsForEligibility,
      tenantId: input.tenantId,
      totalSavingsSnapshot: Number(member.totalSavingsSnapshot),
    }
  )
  const policyMultiple = Number(policy?.loanEligibilityMultiple ?? 2)
  const productMultiple = Number(loanProduct.maxSavingsMultiple)
  const eligibleAmount =
    eligibilitySavingsBase * Math.min(policyMultiple, productMultiple)

  if (requestedAmount > eligibleAmount) {
    throw ExpectedQueryError.validation(
      "Requested amount exceeds the member eligibility snapshot."
    )
  }

  if (
    loanProduct.loanType === "quick" &&
    (policy?.activeFinancingBlocksEmergency ?? true)
  ) {
    const activeFinancingCount = await prisma.loan.count({
      where: {
        memberId: input.memberId,
        status: { in: ["approved", "disbursed", "active"] },
        tenantId: input.tenantId,
      },
    })

    if (activeFinancingCount > 0) {
      throw ExpectedQueryError.precondition(
        "This cooperative blocks emergency financing while the member has active financing."
      )
    }
  }

  const estimatedMonthlyServicing = calculateEstimatedMonthlyServicing(
    requestedAmount,
    input.requestedTermMonths
  )
  const requestedAt = input.requestedAt ?? new Date()
  return runSerializableTransactionWithRetry(
    prisma,
    async (tx) => {
      // The usage read and request insert share one serializable transaction, so a
      // concurrent request cannot silently over-reserve the cycle allocation.
      const capacityCheck = await assertLoanRequestIntakeCapacity(
        {
          loanProduct: { loanType: loanProduct.loanType },
          requestedAmount,
          requestedAt,
          tenantId: input.tenantId,
        },
        tx
      )
      if (input.expectedChargeQuoteHash !== undefined) {
        const currentCharges = await quoteApplicableCharges(
          {
            assessedAt: requestedAt,
            basisAmount: requestedAmount,
            tenantId: input.tenantId,
            trigger: "submission",
            workflow: "loan_request",
          },
          tx as unknown as PrismaClient
        )
        if (
          getLoanRequestChargeQuoteHash(currentCharges, requestedAmount) !==
          input.expectedChargeQuoteHash
        ) {
          throw ExpectedQueryError.precondition(
            "Financing charges changed. Review a fresh quote before submitting."
          )
        }
      }
      const request = await tx.loanRequest.create({
        data: {
          tenantId: input.tenantId,
          memberId: input.memberId,
          loanProductId: input.loanProductId,
          createdByUserId: input.actorUserId,
          requestedAmount,
          requestedTermMonths: input.requestedTermMonths,
          estimatedMonthlyServicing,
          extraMonthlySavingsAmount,
          eligibleAmountSnapshot: eligibleAmount,
          availablePoolSnapshot: metrics.availablePool,
          requestedAt,
          purpose: input.purpose,
          status: "submitted",
        },
      })

      await tx.loanApproval.create({
        data: {
          tenantId: input.tenantId,
          loanRequestId: request.id,
          actorUserId: input.actorUserId,
          action: "submitted",
          actedAt: requestedAt,
          notes: "Loan request submitted from dashboard workflow.",
        },
      })

      const guarantorApprovals = []

      for (const guarantor of guarantorMembers) {
        const approval = await tx.loanGuarantorApproval.create({
          data: {
            tenantId: input.tenantId,
            loanRequestId: request.id,
            guarantorMemberId: guarantor.id,
            requestedByUserId: input.actorUserId,
            requestedAt: request.requestedAt,
            status: "pending",
          },
        })

        guarantorApprovals.push({
          ...approval,
          guarantorMember: guarantor,
        })
      }

      await applyLoanRequestChargesInTransaction(
        {
          actorUserId: input.actorUserId,
          assessedAt: request.requestedAt,
          loanRequestId: request.id,
          memberId: request.memberId,
          requestedAmount: Number(request.requestedAmount),
          tenantId: input.tenantId,
        },
        tx as unknown as PrismaClient
      )

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          actorType: "user",
          action: "loan_request.submitted",
          entityType: "LoanRequest",
          entityId: request.id,
          metadata: {
            availablePool: metrics.availablePool,
            capacity: capacityCheck,
            eligibleAmount,
            eligibilitySavingsBase,
            estimatedMonthlyServicing,
            extraMonthlySavingsAmount,
            guarantorMemberIds,
            memberId: input.memberId,
            requestedAmount,
            requestedTermMonths: input.requestedTermMonths,
            specialSavingsCountsForEligibility,
          },
          occurredAt: requestedAt,
        },
      })

      return {
        ...request,
        borrowerMember: {
          fullName: member.fullName,
          id: member.id,
          memberNumber: member.memberNumber,
        },
        guarantorApprovals,
      }
    },
    "Could not safely reserve financing-cycle capacity"
  )
}

export async function reviewLoanGuarantorApproval(
  input: {
    actorUserId: string
    guarantorApprovalId: string
    notes?: string
    status: "approved" | "rejected"
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  return runSerializableTransactionWithRetry(
    prisma,
    async (tx) => {
      const existingApproval = await tx.loanGuarantorApproval.findFirst({
        where: {
          id: input.guarantorApprovalId,
          tenantId: input.tenantId,
        },
        include: {
          guarantorMember: {
            select: {
              email: true,
              fullName: true,
              id: true,
              memberNumber: true,
            },
          },
          loanRequest: true,
        },
      })

      if (!existingApproval) {
        throw ExpectedQueryError.notFound("Loan guarantor approval not found.")
      }

      if (existingApproval.loanRequest.status === "approved") {
        throw ExpectedQueryError.conflict(
          "Approved loan requests cannot change guarantor evidence."
        )
      }

      if (existingApproval.status !== "pending") {
        throw ExpectedQueryError.conflict(
          "Guarantor evidence is immutable after a response is recorded."
        )
      }

      const approval = await tx.loanGuarantorApproval.update({
        where: { id: existingApproval.id, status: "pending" },
        data: {
          respondedAt: new Date(),
          respondedByUserId: input.actorUserId,
          responseNotes: input.notes ?? null,
          status: input.status,
        },
        include: {
          guarantorMember: {
            select: {
              email: true,
              fullName: true,
              id: true,
              memberNumber: true,
            },
          },
          respondedByUser: {
            select: { id: true, fullName: true, email: true },
          },
        },
      })

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          actorType: "user",
          action: `loan_guarantor_approval.${input.status}`,
          entityType: "LoanGuarantorApproval",
          entityId: approval.id,
          metadata: {
            guarantorMemberId: approval.guarantorMemberId,
            loanRequestId: approval.loanRequestId,
            notes: input.notes ?? null,
            status: input.status,
          },
          occurredAt: new Date(),
        },
      })

      return approval
    },
    "Could not safely record guarantor evidence"
  )
}

export async function respondMemberLoanGuarantorApproval(
  input: {
    actorUserId: string
    guarantorApprovalId: string
    guarantorMemberId: string
    notes?: string
    status: "approved" | "rejected"
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  return runSerializableTransactionWithRetry(
    prisma,
    async (tx) => {
      const existingApproval = await tx.loanGuarantorApproval.findFirst({
        where: {
          guarantorMemberId: input.guarantorMemberId,
          id: input.guarantorApprovalId,
          tenantId: input.tenantId,
        },
        include: {
          guarantorMember: {
            select: {
              email: true,
              fullName: true,
              id: true,
              memberNumber: true,
            },
          },
          loanRequest: true,
        },
      })

      if (!existingApproval) {
        throw ExpectedQueryError.notFound("Loan guarantor approval not found.")
      }

      if (existingApproval.loanRequest.status === "approved") {
        throw ExpectedQueryError.conflict(
          "Approved loan requests cannot change guarantor evidence."
        )
      }

      if (existingApproval.status !== "pending") {
        throw ExpectedQueryError.conflict(
          "Only pending guarantor approvals can be answered by the guarantor."
        )
      }

      const approval = await tx.loanGuarantorApproval.update({
        where: { id: existingApproval.id, status: "pending" },
        data: {
          respondedAt: new Date(),
          respondedByUserId: input.actorUserId,
          responseNotes: input.notes ?? null,
          status: input.status,
        },
        include: {
          guarantorMember: {
            select: {
              email: true,
              fullName: true,
              id: true,
              memberNumber: true,
            },
          },
          loanRequest: {
            include: {
              member: {
                select: {
                  fullName: true,
                  id: true,
                  memberNumber: true,
                },
              },
            },
          },
          respondedByUser: {
            select: { id: true, fullName: true, email: true },
          },
        },
      })

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          actorType: "user",
          action: `loan_guarantor_approval.${input.status}`,
          entityType: "LoanGuarantorApproval",
          entityId: approval.id,
          metadata: {
            guarantorMemberId: approval.guarantorMemberId,
            loanRequestId: approval.loanRequestId,
            notes: input.notes ?? null,
            responseSource: "member_self_service",
            status: input.status,
          },
          occurredAt: new Date(),
        },
      })

      return approval
    },
    "Could not safely record guarantor evidence"
  )
}

export async function reviewLoanRequest(
  input: {
    actorUserId: string
    expectedStatus?: string
    loanRequestId: string
    notes?: string
    /** Server-owned clock override for deterministic internal workflows. */
    reviewedAt?: Date
    status: "approved" | "rejected" | "under_review"
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  const reviewedAt = input.reviewedAt ?? new Date()

  return runSerializableTransactionWithRetry(
    prisma,
    async (tx) => {
      const existingRequest = await tx.loanRequest.findFirst({
        where: { id: input.loanRequestId, tenantId: input.tenantId },
      })
      if (!existingRequest)
        throw ExpectedQueryError.notFound("Loan request not found")

      if (
        input.expectedStatus &&
        existingRequest.status !== input.expectedStatus
      ) {
        throw ExpectedQueryError.conflict(
          `Loan request changed from ${input.expectedStatus} to ${existingRequest.status}. Refresh before reviewing.`
        )
      }

      const allowedTransitions: Record<string, string[]> = {
        submitted: ["under_review", "approved", "rejected"],
        under_review: ["approved", "rejected"],
      }
      if (!allowedTransitions[existingRequest.status]?.includes(input.status)) {
        throw ExpectedQueryError.conflict(
          `Loan request cannot transition from ${existingRequest.status} to ${input.status}.`
        )
      }

      const policy = await tx.tenantPolicy.findUnique({
        where: { tenantId: input.tenantId },
      })

      if (input.status === "approved") {
        const loanProduct = await tx.loanProduct.findFirst({
          where: {
            id: existingRequest.loanProductId,
            isActive: true,
            tenantId: input.tenantId,
          },
        })
        if (!loanProduct) {
          throw ExpectedQueryError.precondition(
            "Loan request cannot be approved because its financing product is no longer active."
          )
        }
        if (existingRequest.requestedTermMonths > loanProduct.termMonths) {
          throw ExpectedQueryError.precondition(
            `Loan request cannot be approved because its term exceeds the current product limit of ${loanProduct.termMonths} months.`
          )
        }
        if (
          Number(existingRequest.requestedAmount) >
          Number(existingRequest.eligibleAmountSnapshot)
        ) {
          throw ExpectedQueryError.precondition(
            "Loan request cannot be approved because it exceeds its recorded eligibility snapshot."
          )
        }
        if (
          loanProduct.loanType === "quick" &&
          (policy?.activeFinancingBlocksEmergency ?? true)
        ) {
          const activeFinancingCount = await tx.loan.count({
            where: {
              memberId: existingRequest.memberId,
              status: { in: ["approved", "disbursed", "active"] },
              tenantId: input.tenantId,
            },
          })
          if (activeFinancingCount > 0) {
            throw ExpectedQueryError.precondition(
              "Loan request cannot be approved while the member has active financing."
            )
          }
        }
      }

      const requiresDualApproval = Boolean(policy?.requiresDualLoanApproval)
      const existingApprovals = await tx.loanApproval.findMany({
        where: {
          tenantId: input.tenantId,
          loanRequestId: existingRequest.id,
          action: "approved",
        },
        orderBy: { actedAt: "asc" },
      })

      const guarantorApprovals = await tx.loanGuarantorApproval.findMany({
        where: {
          tenantId: input.tenantId,
          loanRequestId: existingRequest.id,
        },
        orderBy: { requestedAt: "asc" },
      })

      if (input.status === "approved") {
        const rejectedGuarantor = guarantorApprovals.find(
          (approval) => approval.status === "rejected"
        )

        if (rejectedGuarantor) {
          throw ExpectedQueryError.conflict(
            "Loan request cannot be approved because a guarantor rejected it."
          )
        }

        const pendingGuarantor = guarantorApprovals.find(
          (approval) => approval.status !== "approved"
        )

        if (pendingGuarantor) {
          throw ExpectedQueryError.precondition(
            "Loan request cannot be approved until all guarantors approve."
          )
        }
      }

      let nextStatus = input.status
      let shouldMaterializeLoan = input.status === "approved"

      if (input.status === "approved" && requiresDualApproval) {
        const approvingActorIds = new Set(
          existingApprovals.map((approval) => approval.actorUserId)
        )
        approvingActorIds.add(input.actorUserId)

        if (approvingActorIds.size < 2) {
          nextStatus = "under_review"
          shouldMaterializeLoan = false
        }
      }

      const request = await tx.loanRequest.update({
        where: { id: existingRequest.id, status: existingRequest.status },
        data: {
          reviewNotes: input.notes,
          status: nextStatus,
        },
        include: {
          loanProduct: true,
          member: {
            select: {
              email: true,
              fullName: true,
              id: true,
              memberNumber: true,
            },
          },
        },
      })

      if (input.status === "approved" || input.status === "rejected") {
        await tx.loanApproval.create({
          data: {
            tenantId: input.tenantId,
            loanRequestId: request.id,
            actorUserId: input.actorUserId,
            action: input.status,
            actedAt: reviewedAt,
            notes: input.notes,
          },
        })
      }

      if (shouldMaterializeLoan) {
        try {
          await tx.loan.create({
            data: {
              tenantId: input.tenantId,
              memberId: request.memberId,
              loanRequestId: request.id,
              loanProductId: request.loanProductId,
              principalAmount: request.requestedAmount,
              termMonths: request.requestedTermMonths,
              estimatedMonthlyServicing: request.estimatedMonthlyServicing,
              extraMonthlySavingsAmount: request.extraMonthlySavingsAmount,
              outstandingPrincipal: request.requestedAmount,
              status: "approved",
            },
          })
        } catch (error) {
          if ((error as { code?: string } | null)?.code !== "P2002") throw error
          throw ExpectedQueryError.conflict(
            "Loan request has already been approved."
          )
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          actorType: "user",
          action: `loan_request.${nextStatus}`,
          entityType: "LoanRequest",
          entityId: request.id,
          metadata: {
            approvalCountAfterAction:
              input.status === "approved"
                ? existingApprovals.length + 1
                : existingApprovals.length,
            guarantorApprovalCount: guarantorApprovals.length,
            guarantorGateSatisfied:
              guarantorApprovals.length === 0 ||
              guarantorApprovals.every(
                (approval) => approval.status === "approved"
              ),
            requiresDualApproval,
            notes: input.notes ?? null,
          },
          occurredAt: reviewedAt,
        },
      })

      return request
    },
    "Could not safely review the loan request"
  )
}

export async function recordCollectionFollowUp(
  input: {
    assignedToUserId?: string
    actorUserId: string
    caseStage?: string
    expectedScheduleStatus?: RepaymentScheduleStatus
    note: string
    nextActionAt?: string
    priority?: string
    promiseToPayAt?: string
    repaymentScheduleItemId: string
    resolutionStatus?: string
    status: "promise_to_pay" | "reminded" | "settled" | "unreachable"
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)

  const item = await prisma.repaymentScheduleItem.findFirst({
    where: {
      id: input.repaymentScheduleItemId,
      tenantId: input.tenantId,
    },
    include: {
      loan: {
        include: {
          member: true,
        },
      },
    },
  })

  if (!item) {
    throw ExpectedQueryError.notFound("Repayment schedule item not found")
  }

  if (
    input.expectedScheduleStatus &&
    item.status !== input.expectedScheduleStatus
  ) {
    throw ExpectedQueryError.conflict(
      `Repayment schedule changed from ${input.expectedScheduleStatus} to ${item.status}. Refresh before recording a follow-up.`
    )
  }

  const followUp = await prisma.collectionFollowUp.create({
    data: {
      assignedToUserId: input.assignedToUserId ?? null,
      actorUserId: input.actorUserId,
      caseStage: input.caseStage ?? "active",
      loanId: item.loanId,
      memberId: item.loan.memberId,
      nextActionAt: input.nextActionAt
        ? new Date(`${input.nextActionAt}T00:00:00.000Z`)
        : null,
      note: input.note,
      priority: input.priority ?? "normal",
      promiseToPayAt: input.promiseToPayAt
        ? new Date(`${input.promiseToPayAt}T00:00:00.000Z`)
        : null,
      repaymentScheduleItemId: input.repaymentScheduleItemId,
      resolutionStatus:
        input.resolutionStatus ??
        (input.status === "settled" ? "resolved" : "open"),
      status: input.status,
      tenantId: input.tenantId,
    },
  })

  await prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorType: "user",
      action: "collections.follow_up_recorded",
      entityType: "CollectionFollowUp",
      entityId: followUp.id,
      metadata: {
        loanId: item.loanId,
        memberId: item.loan.memberId,
        assignedToUserId: input.assignedToUserId ?? null,
        caseStage: input.caseStage ?? "active",
        nextActionAt: input.nextActionAt ?? null,
        note: input.note,
        priority: input.priority ?? "normal",
        promiseToPayAt: input.promiseToPayAt ?? null,
        repaymentScheduleItemId: input.repaymentScheduleItemId,
        resolutionStatus:
          input.resolutionStatus ??
          (input.status === "settled" ? "resolved" : "open"),
        status: input.status,
      },
      occurredAt: new Date(),
    },
  })

  return followUp
}

function buildRepaymentSchedule(input: {
  principalAmount: number
  startDate: Date
  termMonths: number
}): Array<{
  amountPaid: number
  chargeDue: number
  dueAt: Date
  installmentNumber: number
  principalDue: number
  status: RepaymentScheduleStatus
  totalDue: number
}> {
  const installmentAmount = input.principalAmount / input.termMonths

  return Array.from({ length: input.termMonths }, (_, index) => {
    const dueAt = new Date(input.startDate)
    dueAt.setUTCMonth(dueAt.getUTCMonth() + index)

    const roundedPrincipal = Number(installmentAmount.toFixed(2))

    return {
      amountPaid: 0,
      chargeDue: 0,
      dueAt,
      installmentNumber: index + 1,
      principalDue: roundedPrincipal,
      status: dueAt <= new Date() ? "due" : "pending",
      totalDue: roundedPrincipal,
    }
  })
}

async function allocateRepaymentAcrossScheduleItems(input: {
  loanId: string
  tenantId: string
  amount: number
  tx: PrismaClient
}) {
  let remaining = input.amount
  let firstAllocatedScheduleItemId: string | null = null
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
    if (allocated > 0 && !firstAllocatedScheduleItemId) {
      firstAllocatedScheduleItemId = item.id
    }
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

  return { firstAllocatedScheduleItemId }
}

export async function stopRemainingScheduleForClearedLoan(input: {
  loanId: string
  tenantId: string
  tx: PrismaClient
}) {
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
  const itemsToWaive = scheduleItems.filter(
    (item) => Number(item.totalDue) - Number(item.amountPaid) > 0
  )

  if (itemsToWaive.length === 0) {
    return {
      waivedOutstandingAmount: 0,
      waivedScheduleItemCount: 0,
      waivedScheduleItemIds: [] as string[],
    }
  }

  await input.tx.repaymentScheduleItem.updateMany({
    where: {
      tenantId: input.tenantId,
      loanId: input.loanId,
      id: {
        in: itemsToWaive.map((item) => item.id),
      },
    },
    data: {
      status: "waived",
    },
  })

  return {
    waivedOutstandingAmount: itemsToWaive.reduce(
      (sum, item) =>
        sum + Math.max(0, Number(item.totalDue) - Number(item.amountPaid)),
      0
    ),
    waivedScheduleItemCount: itemsToWaive.length,
    waivedScheduleItemIds: itemsToWaive.map((item) => item.id),
  }
}

export async function disburseLoan(
  input: {
    actorUserId: string
    /** Server-owned clock override for deterministic internal workflows. */
    disbursedAt?: Date
    expectedStatus?: string
    firstRepaymentDueAt?: string
    loanId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  const disbursedAt = input.disbursedAt ?? new Date()
  const firstRepaymentDueAt = input.firstRepaymentDueAt
    ? new Date(`${input.firstRepaymentDueAt}T00:00:00.000Z`)
    : null
  const disbursementDate = new Date(
    Date.UTC(
      disbursedAt.getUTCFullYear(),
      disbursedAt.getUTCMonth(),
      disbursedAt.getUTCDate()
    )
  )
  if (
    firstRepaymentDueAt &&
    (!Number.isFinite(firstRepaymentDueAt.getTime()) ||
      firstRepaymentDueAt <= disbursementDate)
  ) {
    throw ExpectedQueryError.validation(
      "First repayment date must be after the disbursement date."
    )
  }

  const existingLoan = await prisma.loan.findFirst({
    where: { id: input.loanId, tenantId: input.tenantId },
  })
  if (!existingLoan) throw ExpectedQueryError.notFound("Loan not found")
  if (input.expectedStatus && existingLoan.status !== input.expectedStatus) {
    throw ExpectedQueryError.conflict(
      `Loan changed from ${input.expectedStatus} to ${existingLoan.status}. Refresh before disbursing.`
    )
  }
  // Fast-fail before starting the write transaction. The same check is repeated
  // inside the serializable transaction as the authoritative concurrency guard.
  const preflightPolicy = await prisma.tenantPolicy.findUnique({
    where: { tenantId: input.tenantId },
  })
  const preflightFunds = await getDeployableFundsSnapshot(
    { excludeLoanId: existingLoan.id, tenantId: input.tenantId },
    prisma
  )
  if (
    (preflightPolicy?.disbursementRequiresDeployableFunds ?? true) &&
    Number(existingLoan.principalAmount) > preflightFunds.deployableFunds
  ) {
    throw ExpectedQueryError.precondition(
      `Deployable funds are insufficient for this disbursement. Available: ${preflightFunds.deployableFunds.toLocaleString("en-NG")}.`
    )
  }
  if (existingLoan.status !== "approved" || existingLoan.disbursedAt) {
    throw ExpectedQueryError.conflict(
      "Only an undisbursed approved loan can be disbursed."
    )
  }

  return runSerializableTransactionWithRetry(
    prisma,
    async (tx) => {
      const claimed = await tx.loan.updateMany({
        where: {
          id: existingLoan.id,
          tenantId: input.tenantId,
          status: "approved",
          disbursedAt: null,
        },
        data: {
          disbursedAt,
          firstRepaymentDueAt: firstRepaymentDueAt ?? undefined,
          status: "disbursed",
        },
      })
      if (claimed.count !== 1) {
        throw ExpectedQueryError.conflict(
          "Loan has already been disbursed or is no longer approved."
        )
      }
      const loan = await tx.loan.findFirst({
        where: { id: existingLoan.id, tenantId: input.tenantId },
        include: { loanProduct: true, loanRequest: true },
      })
      if (!loan) throw ExpectedQueryError.notFound("Loan not found")

      const [policy, deployableFunds, cashAccount, loanReceivableAccount] =
        await Promise.all([
          tx.tenantPolicy.findUnique({ where: { tenantId: input.tenantId } }),
          getDeployableFundsSnapshot(
            { excludeLoanId: existingLoan.id, tenantId: input.tenantId },
            tx
          ),
          getLedgerAccountByCode(input.tenantId, "2000", tx),
          getLedgerAccountByCode(input.tenantId, "1100", tx),
        ])
      if (
        (policy?.disbursementRequiresDeployableFunds ?? true) &&
        Number(loan.principalAmount) > deployableFunds.deployableFunds
      ) {
        throw ExpectedQueryError.precondition(
          `Deployable funds are insufficient for this disbursement. Available: ${deployableFunds.deployableFunds.toLocaleString("en-NG")}.`
        )
      }
      if (!cashAccount || !loanReceivableAccount) {
        throw new QueryInfrastructureError(
          "Ledger accounts not initialized for this cooperative"
        )
      }

      await tx.loanApproval.create({
        data: {
          tenantId: input.tenantId,
          loanRequestId: loan.loanRequestId,
          actorUserId: input.actorUserId,
          action: "disbursed",
          actedAt: disbursedAt,
          notes: "Loan disbursed from dashboard workflow.",
        },
      })

      const repaymentStartDate =
        loan.firstRepaymentDueAt ?? new Date(disbursedAt)
      if (!loan.firstRepaymentDueAt) {
        repaymentStartDate.setUTCMonth(repaymentStartDate.getUTCMonth() + 1)
      }

      const scheduleItems = buildRepaymentSchedule({
        principalAmount: Number(loan.principalAmount),
        startDate: repaymentStartDate,
        termMonths: loan.termMonths,
      })

      await tx.repaymentScheduleItem.createMany({
        data: scheduleItems.map((item) => ({
          tenantId: input.tenantId,
          loanId: loan.id,
          installmentNumber: item.installmentNumber,
          dueAt: item.dueAt,
          principalDue: item.principalDue,
          chargeDue: item.chargeDue,
          totalDue: item.totalDue,
          amountPaid: item.amountPaid,
          status: item.status,
        })),
      })

      await postLedgerTransaction(
        {
          tenantId: input.tenantId,
          transactionType: "loan_disbursement",
          postedAt: loan.disbursedAt ?? disbursedAt,
          memberId: loan.memberId,
          loanId: loan.id,
          narration: `Loan disbursement for ${loan.loanProduct.name}`,
          entries: [
            {
              ledgerAccountId: loanReceivableAccount.id,
              direction: "debit",
              amount: Number(loan.principalAmount),
            },
            {
              ledgerAccountId: cashAccount.id,
              direction: "credit",
              amount: Number(loan.principalAmount),
            },
          ],
        },
        tx as unknown as PrismaClient
      )

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          actorType: "user",
          action: "loan.disbursed",
          entityType: "Loan",
          entityId: loan.id,
          metadata: {
            deployableFunds,
            loanRequestId: loan.loanRequestId,
            principalAmount: Number(loan.principalAmount),
            scheduledMonthlyServicing: Number(loan.estimatedMonthlyServicing),
            extraMonthlySavingsAmount: Number(loan.extraMonthlySavingsAmount),
          },
          occurredAt: disbursedAt,
        },
      })

      return loan
    },
    "Could not safely claim loan disbursement"
  )
}

export async function postRepayment(
  input: {
    actorUserId: string
    amount: number
    expectedOutstandingPrincipal?: number
    expectedStatus?: string
    loanId: string
    paidAt?: Date
    reference?: string
    /** @deprecated Direct repayment allocation is always earliest-unpaid first. */
    repaymentScheduleItemId?: string
    sourceType?: "import"
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const amount = normalizePositiveMoney(input.amount, "Repayment amount")
  if (input.sourceType !== "import") {
    await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  }

  const cashAccount = await getLedgerAccountByCode(
    input.tenantId,
    "2000",
    prisma
  )
  const loanReceivableAccount = await getLedgerAccountByCode(
    input.tenantId,
    "1100",
    prisma
  )

  if (!cashAccount || !loanReceivableAccount) {
    throw new QueryInfrastructureError(
      "Ledger accounts not initialized for this cooperative"
    )
  }

  return runSerializableTransactionWithRetry(
    prisma,
    async (tx) => {
      const loan = await tx.loan.findFirst({
        where: { id: input.loanId, tenantId: input.tenantId },
      })
      if (!loan) throw ExpectedQueryError.notFound("Loan not found")
      if (input.expectedStatus && loan.status !== input.expectedStatus) {
        throw ExpectedQueryError.conflict(
          `Financing changed from ${input.expectedStatus} to ${loan.status}. Refresh before posting.`
        )
      }
      if (!["disbursed", "active"].includes(loan.status)) {
        throw ExpectedQueryError.conflict(
          "Repayments can only be posted to disbursed or active loans."
        )
      }
      const previousOutstandingPrincipal = Number(loan.outstandingPrincipal)
      if (
        input.expectedOutstandingPrincipal != null &&
        Math.round(input.expectedOutstandingPrincipal * 100) !==
          Math.round(previousOutstandingPrincipal * 100)
      ) {
        throw ExpectedQueryError.conflict(
          "The outstanding balance changed. Refresh before posting this repayment."
        )
      }
      const nextOutstandingPrincipal = previousOutstandingPrincipal - amount
      const repaymentClearsLoan = nextOutstandingPrincipal <= 0
      const postedAt = input.paidAt ?? new Date()
      if (Number.isNaN(postedAt.getTime())) {
        throw ExpectedQueryError.validation("Repayment date is invalid.")
      }

      if (amount > previousOutstandingPrincipal) {
        throw ExpectedQueryError.validation(
          "Repayment amount exceeds the outstanding loan balance."
        )
      }

      await tx.loan.update({
        where: { id: loan.id },
        data: {
          outstandingPrincipal: {
            decrement: amount,
          },
          status: repaymentClearsLoan ? "completed" : "active",
          ...(repaymentClearsLoan ? { closedAt: postedAt } : {}),
        },
      })

      const allocation = await allocateRepaymentAcrossScheduleItems({
        amount,
        loanId: loan.id,
        tenantId: input.tenantId,
        tx: tx as unknown as PrismaClient,
      })

      const repayment = await tx.repayment.create({
        data: {
          tenantId: input.tenantId,
          memberId: loan.memberId,
          loanId: loan.id,
          // Direct repayment servicing is always earliest-unpaid first. Do not
          // persist a client-selected schedule id that might not receive money.
          repaymentScheduleItemId: allocation.firstAllocatedScheduleItemId,
          receivedByUserId: input.actorUserId,
          paidAt: postedAt,
          amount,
          status: "posted",
          reference: input.reference,
        },
      })

      const settlement = repaymentClearsLoan
        ? await stopRemainingScheduleForClearedLoan({
            loanId: loan.id,
            tenantId: input.tenantId,
            tx: tx as unknown as PrismaClient,
          })
        : null

      await postLedgerTransaction(
        {
          tenantId: input.tenantId,
          transactionType: "loan_repayment",
          postedAt: repayment.paidAt,
          memberId: loan.memberId,
          loanId: loan.id,
          repaymentId: repayment.id,
          reference: input.reference,
          narration: "Loan repayment received",
          sourceType: input.sourceType,
          entries: [
            {
              ledgerAccountId: cashAccount.id,
              direction: "debit",
              amount,
            },
            {
              ledgerAccountId: loanReceivableAccount.id,
              direction: "credit",
              amount,
            },
          ],
        },
        tx as unknown as PrismaClient
      )

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorUserId: input.actorUserId,
          actorType: "user",
          action: "repayment.posted",
          entityType: "Repayment",
          entityId: repayment.id,
          metadata: {
            amount,
            loanId: loan.id,
            repaymentScheduleItemId: allocation.firstAllocatedScheduleItemId,
          },
          occurredAt: new Date(),
        },
      })

      if (repaymentClearsLoan) {
        await tx.auditLog.create({
          data: {
            tenantId: input.tenantId,
            actorUserId: input.actorUserId,
            actorType: "user",
            action: "loan.early_settled",
            entityType: "Loan",
            entityId: loan.id,
            metadata: {
              loanId: loan.id,
              repaymentId: repayment.id,
              repaymentAmount: amount,
              previousOutstandingPrincipal,
              closedAt: postedAt.toISOString(),
              waivedScheduleItemCount: settlement?.waivedScheduleItemCount ?? 0,
              waivedScheduleItemIds: settlement?.waivedScheduleItemIds ?? [],
              waivedScheduleOutstandingAmount:
                settlement?.waivedOutstandingAmount ?? 0,
            },
            occurredAt: postedAt,
          },
        })
      }

      return repayment
    },
    "Could not safely post repayment"
  )
}
