import { ExpectedQueryError } from "../query-error"
import type { PrismaClient } from "../../generated/prisma/client"
import { AppError } from "@halaalvest/errors"
import { createPrismaClient } from "../prisma"

export type RepaymentScheduleStatus =
  | "due"
  | "overdue"
  | "paid"
  | "partially_paid"
  | "pending"
  | "waived"

export type RepaymentStatus = "pending" | "posted" | "reversed"

export type RepaymentScheduleSortField =
  | "dueAt"
  | "installmentNumber"
  | "memberName"
  | "status"

export type RepaymentHistorySortField =
  | "amount"
  | "memberName"
  | "paidAt"
  | "status"

export type CollectionStage =
  | "active"
  | "escalated"
  | "promise_tracking"
  | "resolved"

export type CollectionResolutionStatus = "open" | "resolved"

export type ListRepaymentSchedulePageInput = {
  assignedToUserId?: string
  collectionsOnly?: boolean
  cursor?: string | null
  fromDate?: Date
  memberId?: string
  pageSize?: number
  q?: string
  resolutionStatus?: CollectionResolutionStatus
  sort?: [RepaymentScheduleSortField, "asc" | "desc"] | null
  stage?: CollectionStage
  status?: RepaymentScheduleStatus
  tenantId: string
  toDate?: Date
}

export type ListRepaymentHistoryPageInput = {
  cursor?: string | null
  fromDate?: Date
  memberId?: string
  pageSize?: number
  q?: string
  sort?: [RepaymentHistorySortField, "asc" | "desc"] | null
  status?: RepaymentStatus
  tenantId: string
  toDate?: Date
}

type UserPreview = {
  fullName: string
  id: string
}

export type CollectionFollowUpRow = {
  actorUser: UserPreview
  assignedToUser: UserPreview | null
  assignedToUserId: string | null
  caseStage: CollectionStage
  createdAt: Date
  id: string
  nextActionAt: Date | null
  note: string
  priority: "high" | "low" | "normal"
  promiseToPayAt: Date | null
  resolutionStatus: CollectionResolutionStatus
  status: "promise_to_pay" | "reminded" | "settled" | "unreachable"
  updatedAt: Date
}

export type RepaymentScheduleItemRow = {
  amountPaid: number
  dueAt: Date
  id: string
  installmentNumber: number
  latestCollectionFollowUp: CollectionFollowUpRow | null
  loan: {
    id: string
    loanProduct: { id: string; name: string }
    member: { fullName: string; id: string; memberNumber: string }
    status: string
  }
  outstandingAmount: number
  status: RepaymentScheduleStatus
  totalDue: number
  updatedAt: Date
}

export type RepaymentScheduleItemDetail = RepaymentScheduleItemRow & {
  collectionFollowUps: CollectionFollowUpRow[]
}

export type RepaymentHistoryRow = {
  amount: number
  id: string
  loan: {
    id: string
    loanProduct: { id: string; name: string }
  }
  member: { fullName: string; id: string; memberNumber: string }
  paidAt: Date
  receivedByUser: UserPreview
  reference: string | null
  repaymentScheduleItemId: string | null
  status: RepaymentStatus
}

export type RepaymentSummary = {
  overdueScheduleItems: number
  totalRepaidAmount: number
  totalRepayments: number
  totalScheduleItems: number
  totalOutstandingAmount: number
}

const scheduleStatuses = new Set<RepaymentScheduleStatus>([
  "due",
  "overdue",
  "paid",
  "partially_paid",
  "pending",
  "waived",
])
const repaymentStatuses = new Set<RepaymentStatus>([
  "pending",
  "posted",
  "reversed",
])
const collectionStages = new Set<CollectionStage>([
  "active",
  "escalated",
  "promise_tracking",
  "resolved",
])
const collectionResolutionStatuses = new Set<CollectionResolutionStatus>([
  "open",
  "resolved",
])

type ScheduleCursor = {
  dueAt: string
  id: string
  installmentNumber: number
  memberName: string
  sortDirection: "asc" | "desc"
  sortField: RepaymentScheduleSortField
  status: RepaymentScheduleStatus
}

type HistoryCursor = {
  amount: number
  id: string
  memberName: string
  paidAt: string
  sortDirection: "asc" | "desc"
  sortField: RepaymentHistorySortField
  status: RepaymentStatus
}

function validationError(message: string) {
  return new AppError({ code: "VALIDATION_FAILED", publicMessage: message })
}

function normalizePageSize(pageSize?: number) {
  const value = pageSize ?? 50
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw validationError("Repayment page size must be between 1 and 100.")
  }
  return value
}

function compareAfter(value: unknown, direction: "asc" | "desc") {
  return direction === "asc" ? { gt: value } : { lt: value }
}

function encodeCursor(cursor: ScheduleCursor | HistoryCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url")
}

function decodeScheduleCursor(
  value: string,
  sort?: [RepaymentScheduleSortField, "asc" | "desc"] | null
) {
  try {
    const cursor = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as ScheduleCursor
    const [sortField, sortDirection] = sort ?? ["dueAt", "asc"]

    if (
      !cursor ||
      cursor.sortField !== sortField ||
      cursor.sortDirection !== sortDirection ||
      typeof cursor.id !== "string" ||
      typeof cursor.memberName !== "string" ||
      typeof cursor.installmentNumber !== "number" ||
      !scheduleStatuses.has(cursor.status) ||
      Number.isNaN(new Date(cursor.dueAt).getTime())
    ) {
      throw ExpectedQueryError.validation("Invalid repayment schedule cursor")
    }

    return cursor
  } catch {
    throw validationError("Repayment schedule cursor is invalid.")
  }
}

function decodeHistoryCursor(
  value: string,
  sort?: [RepaymentHistorySortField, "asc" | "desc"] | null
) {
  try {
    const cursor = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as HistoryCursor
    const [sortField, sortDirection] = sort ?? ["paidAt", "desc"]

    if (
      !cursor ||
      cursor.sortField !== sortField ||
      cursor.sortDirection !== sortDirection ||
      typeof cursor.id !== "string" ||
      typeof cursor.memberName !== "string" ||
      typeof cursor.amount !== "number" ||
      !repaymentStatuses.has(cursor.status) ||
      Number.isNaN(new Date(cursor.paidAt).getTime())
    ) {
      throw ExpectedQueryError.validation("Invalid repayment history cursor")
    }

    return cursor
  } catch {
    throw validationError("Repayment history cursor is invalid.")
  }
}

function scheduleInclude(detail = false) {
  return {
    collectionFollowUps: {
      include: {
        actorUser: { select: { fullName: true, id: true } },
        assignedToUser: { select: { fullName: true, id: true } },
      },
      orderBy: { createdAt: "desc" as const },
      ...(detail ? {} : { take: 1 }),
    },
    loan: {
      select: {
        id: true,
        loanProduct: { select: { id: true, name: true } },
        member: { select: { fullName: true, id: true, memberNumber: true } },
        status: true,
      },
    },
  } as const
}

function historyInclude() {
  return {
    loan: {
      select: {
        id: true,
        loanProduct: { select: { id: true, name: true } },
      },
    },
    member: { select: { fullName: true, id: true, memberNumber: true } },
    receivedByUser: { select: { fullName: true, id: true } },
  } as const
}

function normalizeFollowUp(followUp: any): CollectionFollowUpRow {
  return {
    actorUser: {
      fullName: followUp.actorUser.fullName,
      id: followUp.actorUser.id,
    },
    assignedToUser: followUp.assignedToUser
      ? {
          fullName: followUp.assignedToUser.fullName,
          id: followUp.assignedToUser.id,
        }
      : null,
    assignedToUserId: followUp.assignedToUserId ?? null,
    caseStage: followUp.caseStage,
    createdAt: followUp.createdAt,
    id: followUp.id,
    nextActionAt: followUp.nextActionAt ?? null,
    note: followUp.note,
    priority: followUp.priority,
    promiseToPayAt: followUp.promiseToPayAt ?? null,
    resolutionStatus: followUp.resolutionStatus,
    status: followUp.status,
    updatedAt: followUp.updatedAt,
  }
}

function normalizeScheduleItem(
  item: any,
  detail = false
): RepaymentScheduleItemRow | RepaymentScheduleItemDetail {
  const followUps = (item.collectionFollowUps ?? []).map(normalizeFollowUp)
  const row: RepaymentScheduleItemRow = {
    amountPaid: Number(item.amountPaid),
    dueAt: item.dueAt,
    id: item.id,
    installmentNumber: item.installmentNumber,
    latestCollectionFollowUp: followUps[0] ?? null,
    loan: {
      id: item.loan.id,
      loanProduct: {
        id: item.loan.loanProduct.id,
        name: item.loan.loanProduct.name,
      },
      member: {
        fullName: item.loan.member.fullName,
        id: item.loan.member.id,
        memberNumber: item.loan.member.memberNumber,
      },
      status: item.loan.status,
    },
    outstandingAmount: Math.max(0, Number(item.totalDue) - Number(item.amountPaid)),
    status: item.status,
    totalDue: Number(item.totalDue),
    updatedAt: item.updatedAt,
  }

  return detail ? { ...row, collectionFollowUps: followUps } : row
}

function normalizeHistory(repayment: any): RepaymentHistoryRow {
  return {
    amount: Number(repayment.amount),
    id: repayment.id,
    loan: {
      id: repayment.loan.id,
      loanProduct: {
        id: repayment.loan.loanProduct.id,
        name: repayment.loan.loanProduct.name,
      },
    },
    member: {
      fullName: repayment.member.fullName,
      id: repayment.member.id,
      memberNumber: repayment.member.memberNumber,
    },
    paidAt: repayment.paidAt,
    receivedByUser: {
      fullName: repayment.receivedByUser.fullName,
      id: repayment.receivedByUser.id,
    },
    reference: repayment.reference ?? null,
    repaymentScheduleItemId: repayment.repaymentScheduleItemId ?? null,
    status: repayment.status,
  }
}

function assertScheduleFilters(input: ListRepaymentSchedulePageInput) {
  if (input.status && !scheduleStatuses.has(input.status)) {
    throw validationError("Repayment schedule status is not supported.")
  }
  if (input.stage && !collectionStages.has(input.stage)) {
    throw validationError("Collection stage is not supported.")
  }
  if (
    input.resolutionStatus &&
    !collectionResolutionStatuses.has(input.resolutionStatus)
  ) {
    throw validationError("Collection resolution status is not supported.")
  }
  if (input.collectionsOnly && input.status && input.status !== "overdue") {
    throw validationError(
      "Collections only is limited to overdue repayment schedule items."
    )
  }
}

function getScheduleWhere(input: ListRepaymentSchedulePageInput) {
  const followUpPredicate = {
    ...(input.assignedToUserId
      ? { assignedToUserId: input.assignedToUserId }
      : {}),
    ...(input.stage ? { caseStage: input.stage } : {}),
    ...(input.resolutionStatus
      ? { resolutionStatus: input.resolutionStatus }
      : {}),
  }
  const hasFollowUpFilter = Object.keys(followUpPredicate).length > 0
  const loanPredicates = [
    ...(input.memberId ? [{ memberId: input.memberId }] : []),
    ...(input.q
      ? [
          {
            OR: [
              {
                member: {
                  is: {
                    fullName: {
                      contains: input.q,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
              {
                member: {
                  is: {
                    memberNumber: {
                      contains: input.q,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
              {
                loanProduct: {
                  is: {
                    name: {
                      contains: input.q,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
            ],
          },
        ]
      : []),
  ]

  return {
    tenantId: input.tenantId,
    ...(input.collectionsOnly
      ? { status: "overdue" }
      : input.status
        ? { status: input.status }
        : {}),
    ...(input.fromDate || input.toDate
      ? {
          dueAt: {
            ...(input.fromDate ? { gte: input.fromDate } : {}),
            ...(input.toDate ? { lte: input.toDate } : {}),
          },
        }
      : {}),
    ...(loanPredicates.length
      ? { loan: { is: { AND: loanPredicates } } }
      : {}),
    ...(hasFollowUpFilter
      ? { collectionFollowUps: { some: followUpPredicate } }
      : {}),
  }
}

function getHistoryWhere(input: ListRepaymentHistoryPageInput) {
  return {
    tenantId: input.tenantId,
    ...(input.memberId ? { memberId: input.memberId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.fromDate || input.toDate
      ? {
          paidAt: {
            ...(input.fromDate ? { gte: input.fromDate } : {}),
            ...(input.toDate ? { lte: input.toDate } : {}),
          },
        }
      : {}),
    ...(input.q
      ? {
          OR: [
            {
              member: {
                is: {
                  fullName: { contains: input.q, mode: "insensitive" as const },
                },
              },
            },
            {
              member: {
                is: {
                  memberNumber: {
                    contains: input.q,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
            { reference: { contains: input.q, mode: "insensitive" as const } },
            {
              loan: {
                is: {
                  loanProduct: {
                    is: {
                      name: {
                        contains: input.q,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                },
              },
            },
          ],
        }
      : {}),
  }
}

function scheduleOrderBy(
  sort?: [RepaymentScheduleSortField, "asc" | "desc"] | null
) {
  const [field, direction] = sort ?? ["dueAt", "asc"]
  if (field === "memberName") {
    return [
      { loan: { member: { fullName: direction } } },
      { dueAt: "asc" as const },
      { id: "asc" as const },
    ]
  }
  if (field === "dueAt") {
    return [
      { dueAt: direction },
      { installmentNumber: "asc" as const },
      { id: "asc" as const },
    ]
  }
  return [
    { [field]: direction },
    { dueAt: "asc" as const },
    { id: "asc" as const },
  ]
}

function historyOrderBy(
  sort?: [RepaymentHistorySortField, "asc" | "desc"] | null
) {
  const [field, direction] = sort ?? ["paidAt", "desc"]
  if (field === "memberName") {
    return [
      { member: { fullName: direction } },
      { paidAt: "desc" as const },
      { id: "desc" as const },
    ]
  }
  if (field === "paidAt") {
    return [{ paidAt: direction }, { id: direction }]
  }
  return [
    { [field]: direction },
    { paidAt: "desc" as const },
    { id: "desc" as const },
  ]
}

function scheduleKeysetWhere(input: {
  cursor: ScheduleCursor
  sort?: [RepaymentScheduleSortField, "asc" | "desc"] | null
}) {
  const [field, direction] = input.sort ?? ["dueAt", "asc"]
  const cursor = input.cursor
  const dueAtTie = {
    OR: [
      { dueAt: compareAfter(new Date(cursor.dueAt), "asc") },
      {
        AND: [
          { dueAt: new Date(cursor.dueAt) },
          { id: compareAfter(cursor.id, "asc") },
        ],
      },
    ],
  }

  if (field === "dueAt") {
    return {
      OR: [
        { dueAt: compareAfter(new Date(cursor.dueAt), direction) },
        {
          AND: [
            { dueAt: new Date(cursor.dueAt) },
            {
              installmentNumber: compareAfter(cursor.installmentNumber, "asc"),
            },
          ],
        },
        {
          AND: [
            { dueAt: new Date(cursor.dueAt) },
            { installmentNumber: cursor.installmentNumber },
            { id: compareAfter(cursor.id, "asc") },
          ],
        },
      ],
    }
  }

  const primaryEquals =
    field === "memberName"
      ? { loan: { is: { member: { is: { fullName: cursor.memberName } } } } }
      : { [field]: cursor[field] }
  const primaryAfter =
    field === "memberName"
      ? {
          loan: {
            is: {
              member: {
                is: { fullName: compareAfter(cursor.memberName, direction) },
              },
            },
          },
        }
      : { [field]: compareAfter(cursor[field], direction) }

  return {
    OR: [primaryAfter, { AND: [primaryEquals, dueAtTie] }],
  }
}

function historyKeysetWhere(input: {
  cursor: HistoryCursor
  sort?: [RepaymentHistorySortField, "asc" | "desc"] | null
}) {
  const [field, direction] = input.sort ?? ["paidAt", "desc"]
  const cursor = input.cursor
  if (field === "paidAt") {
    return {
      OR: [
        { paidAt: compareAfter(new Date(cursor.paidAt), direction) },
        {
          AND: [
            { paidAt: new Date(cursor.paidAt) },
            { id: compareAfter(cursor.id, direction) },
          ],
        },
      ],
    }
  }
  const paidAtTie = {
    OR: [
      { paidAt: compareAfter(new Date(cursor.paidAt), "desc") },
      {
        AND: [
          { paidAt: new Date(cursor.paidAt) },
          { id: compareAfter(cursor.id, "desc") },
        ],
      },
    ],
  }
  const primaryEquals =
    field === "memberName"
      ? { member: { is: { fullName: cursor.memberName } } }
      : { [field]: cursor[field] }
  const primaryAfter =
    field === "memberName"
      ? { member: { is: { fullName: compareAfter(cursor.memberName, direction) } } }
      : { [field]: compareAfter(cursor[field], direction) }

  return { OR: [primaryAfter, { AND: [primaryEquals, paidAtTie] }] }
}

export function createRepaymentScheduleCursor(
  row: RepaymentScheduleItemRow,
  sort?: [RepaymentScheduleSortField, "asc" | "desc"] | null
) {
  const [sortField, sortDirection] = sort ?? ["dueAt", "asc"]
  return encodeCursor({
    dueAt: row.dueAt.toISOString(),
    id: row.id,
    installmentNumber: row.installmentNumber,
    memberName: row.loan.member.fullName,
    sortDirection,
    sortField,
    status: row.status,
  })
}

export function createRepaymentHistoryCursor(
  row: RepaymentHistoryRow,
  sort?: [RepaymentHistorySortField, "asc" | "desc"] | null
) {
  const [sortField, sortDirection] = sort ?? ["paidAt", "desc"]
  return encodeCursor({
    amount: row.amount,
    id: row.id,
    memberName: row.member.fullName,
    paidAt: row.paidAt.toISOString(),
    sortDirection,
    sortField,
    status: row.status,
  })
}

export async function listRepaymentSchedulePage(
  input: ListRepaymentSchedulePageInput,
  prismaOverride?: PrismaClient
) {
  assertScheduleFilters(input)
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  const pageSize = normalizePageSize(input.pageSize)
  const where = getScheduleWhere(input)
  const cursor = input.cursor
    ? decodeScheduleCursor(input.cursor, input.sort)
    : null
  const pageWhere = cursor
    ? { AND: [where, scheduleKeysetWhere({ cursor, sort: input.sort })] }
    : where
  const [items, total] = await Promise.all([
    prisma.repaymentScheduleItem.findMany({
      include: scheduleInclude(),
      orderBy: scheduleOrderBy(input.sort),
      take: pageSize + 1,
      where: pageWhere,
    }),
    prisma.repaymentScheduleItem.count({ where }),
  ])
  const data = items.slice(0, pageSize).map((item: any) =>
    normalizeScheduleItem(item)
  ) as RepaymentScheduleItemRow[]

  return {
    data,
    meta: {
      cursor:
        items.length > pageSize && data.at(-1)
          ? createRepaymentScheduleCursor(data.at(-1)!, input.sort)
          : undefined,
      hasNextPage: items.length > pageSize,
      total,
    },
  }
}

export async function getRepaymentScheduleItem(
  input: { repaymentScheduleItemId: string; tenantId: string },
  prismaOverride?: PrismaClient
): Promise<RepaymentScheduleItemDetail | null> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return null
  const item = await prisma.repaymentScheduleItem.findFirst({
    include: scheduleInclude(true),
    where: { id: input.repaymentScheduleItemId, tenantId: input.tenantId },
  })
  return item ? (normalizeScheduleItem(item, true) as RepaymentScheduleItemDetail) : null
}

export async function listRepaymentHistoryPage(
  input: ListRepaymentHistoryPageInput,
  prismaOverride?: PrismaClient
) {
  if (input.status && !repaymentStatuses.has(input.status)) {
    throw validationError("Repayment status is not supported.")
  }
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  const pageSize = normalizePageSize(input.pageSize)
  const where = getHistoryWhere(input)
  const cursor = input.cursor
    ? decodeHistoryCursor(input.cursor, input.sort)
    : null
  const pageWhere = cursor
    ? { AND: [where, historyKeysetWhere({ cursor, sort: input.sort })] }
    : where
  const [repayments, total] = await Promise.all([
    prisma.repayment.findMany({
      include: historyInclude(),
      orderBy: historyOrderBy(input.sort),
      take: pageSize + 1,
      where: pageWhere,
    }),
    prisma.repayment.count({ where }),
  ])
  const data = repayments.slice(0, pageSize).map(normalizeHistory)

  return {
    data,
    meta: {
      cursor:
        repayments.length > pageSize && data.at(-1)
          ? createRepaymentHistoryCursor(data.at(-1)!, input.sort)
          : undefined,
      hasNextPage: repayments.length > pageSize,
      total,
    },
  }
}

export async function getRepayment(
  input: { repaymentId: string; tenantId: string },
  prismaOverride?: PrismaClient
): Promise<RepaymentHistoryRow | null> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return null
  const repayment = await prisma.repayment.findFirst({
    include: historyInclude(),
    where: { id: input.repaymentId, tenantId: input.tenantId },
  })
  return repayment ? normalizeHistory(repayment) : null
}

export async function getRepaymentSummary(
  input: Omit<ListRepaymentSchedulePageInput, "cursor" | "pageSize" | "sort">,
  prismaOverride?: PrismaClient
): Promise<RepaymentSummary> {
  assertScheduleFilters(input)
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")
  const where = getScheduleWhere(input)
  const [totalScheduleItems, overdueScheduleItems, scheduleTotals, totalRepayments] =
    await Promise.all([
      prisma.repaymentScheduleItem.count({ where }),
      prisma.repaymentScheduleItem.count({
        where: { AND: [where, { status: "overdue" }] },
      }),
      prisma.repaymentScheduleItem.aggregate({
        _sum: { amountPaid: true, totalDue: true },
        where,
      }),
      prisma.repayment.count({
        where: {
          tenantId: input.tenantId,
          ...(input.memberId ? { memberId: input.memberId } : {}),
        },
      }),
    ])
  const totalDue = Number(scheduleTotals._sum.totalDue ?? 0)
  const totalRepaidAmount = Number(scheduleTotals._sum.amountPaid ?? 0)

  return {
    overdueScheduleItems,
    totalRepaidAmount,
    totalRepayments,
    totalScheduleItems,
    totalOutstandingAmount: Math.max(0, totalDue - totalRepaidAmount),
  }
}
