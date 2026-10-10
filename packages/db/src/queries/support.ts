import { ExpectedQueryError } from "../query-error"
import type { PrismaClient } from "../../generated/prisma/client"
import { AppError } from "@halaalvest/errors"
import { isSafeSupportAttachmentUrl } from "@halaalvest/utils"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"
import { claimDashboardEvidenceUploadLink } from "./dashboard-evidence-uploads"

function supportAttachmentUrl(value: string | null | undefined): string | null {
  const url = value?.trim() || null
  if (url && !isSafeSupportAttachmentUrl(url)) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Use an HTTPS attachment link or a private upload.",
    })
  }
  return url
}

export type SupportCaseStatus =
  | "open"
  | "in_progress"
  | "waiting_on_member"
  | "resolved"
  | "closed"

export type SupportCasePriority = "low" | "normal" | "high" | "urgent"

export type SupportCaseCategory =
  | "payment_issue"
  | "account_update"
  | "shares"
  | "financing"
  | "procurement"
  | "feature_request"
  | "technical"
  | "other"

export type SupportCaseLinkedRecordType =
  | "member"
  | "contribution"
  | "repayment"
  | "loan_request"
  | "loan"
  | "share_application"
  | "procurement"
  | "receipt"
  | "other"

export type SupportCaseMessageAuthorType = "member" | "staff" | "system"

export type SupportFinancialAdjustmentApprovalStatus =
  | "not_required"
  | "pending"
  | "approved"
  | "rejected"

export type SupportCaseRow = {
  assignedToUser: {
    email: string
    fullName: string
    id: string
  } | null
  assignedToUserId: string | null
  category: SupportCaseCategory
  closedAt: Date | null
  createdAt: Date
  description: string
  id: string
  financialAdjustmentApprovalNotes: string | null
  financialAdjustmentApprovalStatus: SupportFinancialAdjustmentApprovalStatus
  financialAdjustmentApprovedAt: Date | null
  financialAdjustmentApprovedByUser: {
    email: string
    fullName: string
    id: string
  } | null
  financialAdjustmentApprovedByUserId: string | null
  linkedRecordId: string | null
  linkedRecordType: SupportCaseLinkedRecordType | null
  member: {
    email: string | null
    fullName: string
    id: string
    memberNumber: string
  } | null
  memberId: string | null
  messages: SupportCaseMessageRow[]
  moneyImpactRequested: boolean
  openedByUserId: string | null
  priority: SupportCasePriority
  requiresFinancialAdjustment: boolean
  resolutionSummary: string | null
  resolvedAt: Date | null
  specialSavingsWithdrawal: {
    amount: number
    id: string
    paidAt: Date
    reference: string
  } | null
  status: SupportCaseStatus
  subject: string
  updatedAt: Date
}

export type SupportCaseMessageRow = {
  attachmentUrl: string | null
  authorType: SupportCaseMessageAuthorType
  authorUser: {
    email: string
    fullName: string
    id: string
  } | null
  authorUserId: string | null
  createdAt: Date
  id: string
  message: string
  supportCaseId: string
}

export type SupportCaseSummary = {
  closedCases: number
  featureRequestOpenCases: number
  highPriorityOpenCases: number
  openCases: number
  totalCases: number
  urgentOpenCases: number
}

export type SupportCaseSortField =
  | "assignedToUser"
  | "category"
  | "createdAt"
  | "latestReply"
  | "linkedRecord"
  | "priority"
  | "status"
  | "subject"
  | "updatedAt"

export type ListSupportCasePageFilters = {
  assignedToUserId?: string
  category?: SupportCaseCategory
  cursor?: string | null
  fromDate?: Date
  limit?: number
  memberId?: string
  page?: number
  pageSize?: number
  priority?: SupportCasePriority
  search?: string
  sort?: [SupportCaseSortField, "asc" | "desc"] | null
  status?: SupportCaseStatus
  toDate?: Date
}

const supportCaseStatuses = new Set([
  "open",
  "in_progress",
  "waiting_on_member",
  "resolved",
  "closed",
])
const supportCasePriorities = new Set(["low", "normal", "high", "urgent"])
const supportCaseCategories = new Set([
  "payment_issue",
  "account_update",
  "shares",
  "financing",
  "procurement",
  "feature_request",
  "technical",
  "other",
])
const supportCaseLinkedRecordTypes = new Set([
  "member",
  "contribution",
  "repayment",
  "loan_request",
  "loan",
  "share_application",
  "procurement",
  "receipt",
  "other",
])
const supportCaseMessageAuthorTypes = new Set(["member", "staff", "system"])
const supportFinancialAdjustmentApprovalStatuses = new Set([
  "not_required",
  "pending",
  "approved",
  "rejected",
])
const openSupportCaseStatuses = ["open", "in_progress", "waiting_on_member"]

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

function assertChoice(value: string, validValues: Set<string>, label: string) {
  if (!validValues.has(value)) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: `${label} is not supported.`,
    })
  }
}

function normalizeSupportCaseMessage(message: any): SupportCaseMessageRow {
  return {
    attachmentUrl: message.attachmentUrl ?? null,
    authorType: message.authorType,
    authorUser: message.authorUser
      ? {
          email: message.authorUser.email,
          fullName: message.authorUser.fullName,
          id: message.authorUser.id,
        }
      : null,
    authorUserId: message.authorUserId ?? null,
    createdAt: message.createdAt,
    id: message.id,
    message: message.message,
    supportCaseId: message.supportCaseId,
  }
}

function normalizeSupportCase(supportCase: any): SupportCaseRow {
  return {
    assignedToUser: supportCase.assignedToUser
      ? {
          email: supportCase.assignedToUser.email,
          fullName: supportCase.assignedToUser.fullName,
          id: supportCase.assignedToUser.id,
        }
      : null,
    assignedToUserId: supportCase.assignedToUserId ?? null,
    category: supportCase.category,
    closedAt: supportCase.closedAt ?? null,
    createdAt: supportCase.createdAt,
    description: supportCase.description,
    financialAdjustmentApprovalNotes:
      supportCase.financialAdjustmentApprovalNotes ?? null,
    financialAdjustmentApprovalStatus:
      supportCase.financialAdjustmentApprovalStatus ??
      (supportCase.requiresFinancialAdjustment ? "pending" : "not_required"),
    financialAdjustmentApprovedAt:
      supportCase.financialAdjustmentApprovedAt ?? null,
    financialAdjustmentApprovedByUser:
      supportCase.financialAdjustmentApprovedByUser
        ? {
            email: supportCase.financialAdjustmentApprovedByUser.email,
            fullName: supportCase.financialAdjustmentApprovedByUser.fullName,
            id: supportCase.financialAdjustmentApprovedByUser.id,
          }
        : null,
    financialAdjustmentApprovedByUserId:
      supportCase.financialAdjustmentApprovedByUserId ?? null,
    id: supportCase.id,
    linkedRecordId: supportCase.linkedRecordId ?? null,
    linkedRecordType: supportCase.linkedRecordType ?? null,
    member: supportCase.member
      ? {
          email: supportCase.member.email ?? null,
          fullName: supportCase.member.fullName,
          id: supportCase.member.id,
          memberNumber: supportCase.member.memberNumber,
        }
      : null,
    memberId: supportCase.memberId ?? null,
    messages: (supportCase.messages ?? []).map(normalizeSupportCaseMessage),
    moneyImpactRequested: Boolean(supportCase.moneyImpactRequested),
    openedByUserId: supportCase.openedByUserId ?? null,
    priority: supportCase.priority,
    requiresFinancialAdjustment: Boolean(
      supportCase.requiresFinancialAdjustment
    ),
    resolutionSummary: supportCase.resolutionSummary ?? null,
    resolvedAt: supportCase.resolvedAt ?? null,
    specialSavingsWithdrawal: supportCase.specialSavingsWithdrawal
      ? {
          amount: Number(supportCase.specialSavingsWithdrawal.amount),
          id: supportCase.specialSavingsWithdrawal.id,
          paidAt: supportCase.specialSavingsWithdrawal.paidAt,
          reference: supportCase.specialSavingsWithdrawal.reference,
        }
      : null,
    status: supportCase.status,
    subject: supportCase.subject,
    updatedAt: supportCase.updatedAt,
  }
}

function supportCaseInclude() {
  return {
    assignedToUser: {
      select: {
        email: true,
        fullName: true,
        id: true,
      },
    },
    financialAdjustmentApprovedByUser: {
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
    specialSavingsWithdrawal: {
      select: {
        amount: true,
        id: true,
        paidAt: true,
        reference: true,
      },
    },
    messages: {
      include: {
        authorUser: {
          select: {
            email: true,
            fullName: true,
            id: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    },
  } as const
}

async function assertMemberBelongsToTenant(
  input: {
    memberId?: string | null
    tenantId: string
  },
  prisma: any
) {
  if (!input.memberId) {
    return null
  }

  const member = await prisma.member.findFirst({
    select: {
      id: true,
    },
    where: {
      id: input.memberId,
      tenantId: input.tenantId,
    },
  })

  if (!member) {
    throw new AppError({
      code: "NOT_FOUND",
      publicMessage: "Member does not belong to this cooperative.",
    })
  }

  return member
}

async function assertUserBelongsToTenant(
  input: {
    label: string
    tenantId: string
    userId?: string | null
  },
  prisma: any
) {
  if (!input.userId) {
    return null
  }

  const user = await prisma.user.findFirst({
    select: {
      id: true,
    },
    where: {
      deletedAt: null,
      id: input.userId,
      tenantId: input.tenantId,
    },
  })

  if (!user) {
    throw new AppError({
      code: "PERMISSION_DENIED",
      publicMessage: `${input.label} does not belong to this cooperative.`,
    })
  }

  return user
}

async function assertLinkedRecordBelongsToTenant(
  input: {
    linkedRecordId?: string | null
    linkedRecordType?: SupportCaseLinkedRecordType | null
    memberId?: string | null
    tenantId: string
  },
  prisma: any
) {
  if (!input.linkedRecordId && !input.linkedRecordType) {
    return
  }

  if (!input.linkedRecordId || !input.linkedRecordType) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Linked record type and id are required together.",
    })
  }

  if (input.linkedRecordType !== "receipt") {
    return
  }

  const receipt = await prisma.memberPaymentReceipt.findFirst({
    select: {
      id: true,
    },
    where: {
      id: input.linkedRecordId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
      tenantId: input.tenantId,
    },
  })

  if (!receipt) {
    throw new AppError({
      code: "PERMISSION_DENIED",
      publicMessage: "Linked receipt does not belong to this member profile.",
    })
  }
}

async function readSupportCase(
  input: {
    memberId?: string
    supportCaseId: string
    tenantId: string
  },
  prisma: any
) {
  const supportCase = await prisma.supportCase.findFirst({
    include: supportCaseInclude(),
    where: {
      id: input.supportCaseId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
      tenantId: input.tenantId,
    },
  })

  if (!supportCase) {
    throw new AppError({
      code: "NOT_FOUND",
      publicMessage: "Support case was not found.",
    })
  }

  return supportCase
}

export async function getSupportCase(
  input: {
    memberId?: string
    supportCaseId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<SupportCaseRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  return normalizeSupportCase(await readSupportCase(input, prisma))
}

export async function findSupportCase(
  input: {
    memberId?: string
    supportCaseId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<SupportCaseRow | null> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return null

  const supportCase = await prisma.supportCase.findFirst({
    include: supportCaseInclude(),
    where: {
      id: input.supportCaseId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
      tenantId: input.tenantId,
    },
  })

  return supportCase ? normalizeSupportCase(supportCase) : null
}

export async function listSupportCases(
  input: {
    assignedToUserId?: string
    category?: SupportCaseCategory
    fromDate?: Date
    limit?: number
    memberId?: string
    status?: SupportCaseStatus
    tenantId: string
    toDate?: Date
  },
  prismaOverride?: PrismaClient
): Promise<SupportCaseRow[]> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  const supportCases = await prisma.supportCase.findMany({
    include: supportCaseInclude(),
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: input.limit ?? 50,
    where: {
      tenantId: input.tenantId,
      ...(input.fromDate || input.toDate
        ? {
            createdAt: {
              ...(input.fromDate ? { gte: input.fromDate } : {}),
              ...(input.toDate ? { lte: input.toDate } : {}),
            },
          }
        : {}),
      ...(input.assignedToUserId
        ? { assignedToUserId: input.assignedToUserId }
        : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.memberId ? { memberId: input.memberId } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
  })

  return supportCases.map(normalizeSupportCase)
}

function getSupportCaseOrderBy(
  sort?: [SupportCaseSortField, "asc" | "desc"] | null
) {
  const [sortField, direction] = sort ?? ["updatedAt", "desc"]

  if (sortField === "assignedToUser") {
    return [
      { assignedToUser: { fullName: direction } },
      { updatedAt: "desc" as const },
      { id: "desc" as const },
    ]
  }

  if (sortField === "latestReply") {
    return [
      { updatedAt: direction },
      { createdAt: direction },
      { id: direction },
    ]
  }

  if (sortField === "linkedRecord") {
    return [
      { linkedRecordType: direction },
      { updatedAt: "desc" as const },
      { id: "desc" as const },
    ]
  }

  if (sortField === "updatedAt") {
    return [
      { updatedAt: direction },
      { createdAt: direction },
      { id: direction },
    ]
  }

  return [
    { [sortField]: direction },
    { updatedAt: "desc" as const },
    { id: "desc" as const },
  ]
}

type SupportCaseCursor = {
  createdAt: string
  direction: "asc" | "desc"
  id: string
  primary: string | null
  sortField: SupportCaseSortField
  updatedAt: string
  version: 1
}

function encodeSupportCaseCursor(
  supportCase: Record<string, any>,
  sort?: [SupportCaseSortField, "asc" | "desc"] | null
) {
  const [sortField, direction] = sort ?? ["updatedAt", "desc"]
  const primary =
    sortField === "assignedToUser"
      ? (supportCase.assignedToUser?.fullName ?? null)
      : sortField === "latestReply"
        ? supportCase.updatedAt
        : sortField === "linkedRecord"
          ? supportCase.linkedRecordType
          : supportCase[sortField]

  const cursor: SupportCaseCursor = {
    createdAt: new Date(supportCase.createdAt).toISOString(),
    direction,
    id: supportCase.id,
    primary:
      primary instanceof Date
        ? primary.toISOString()
        : primary === null || primary === undefined
          ? null
          : String(primary),
    sortField,
    updatedAt: new Date(supportCase.updatedAt).toISOString(),
    version: 1,
  }

  return Buffer.from(JSON.stringify(cursor)).toString("base64url")
}

function decodeSupportCaseCursor(
  value: string,
  sort?: [SupportCaseSortField, "asc" | "desc"] | null
) {
  const [sortField, direction] = sort ?? ["updatedAt", "desc"]

  try {
    const cursor = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as Partial<SupportCaseCursor>

    if (
      cursor.version !== 1 ||
      cursor.sortField !== sortField ||
      cursor.direction !== direction ||
      typeof cursor.id !== "string" ||
      typeof cursor.createdAt !== "string" ||
      typeof cursor.updatedAt !== "string" ||
      (cursor.primary !== null && typeof cursor.primary !== "string") ||
      Number.isNaN(Date.parse(cursor.createdAt)) ||
      Number.isNaN(Date.parse(cursor.updatedAt))
    ) {
      throw ExpectedQueryError.validation("Invalid support case cursor")
    }

    return cursor as SupportCaseCursor
  } catch {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Support case cursor is invalid.",
    })
  }
}

function scalarCursorCondition(
  field: string,
  direction: "asc" | "desc",
  value: string | null,
  valueType: "date" | "string" = "string"
) {
  const cursorValue =
    value !== null && valueType === "date" ? new Date(value) : value

  if (cursorValue === null) {
    return direction === "desc" ? { [field]: { not: null } } : null
  }

  const comparison = {
    [field]: { [direction === "asc" ? "gt" : "lt"]: cursorValue },
  }

  return direction === "asc"
    ? { OR: [comparison, { [field]: null }] }
    : comparison
}

function scalarCursorEquality(
  field: string,
  value: string | null,
  valueType: "date" | "string" = "string"
) {
  return {
    [field]: value !== null && valueType === "date" ? new Date(value) : value,
  }
}

function assigneeCursorCondition(
  direction: "asc" | "desc",
  value: string | null
) {
  if (value === null) {
    return direction === "desc" ? { assignedToUser: { isNot: null } } : null
  }

  const comparison = {
    assignedToUser: {
      is: { fullName: { [direction === "asc" ? "gt" : "lt"]: value } },
    },
  }

  return direction === "asc"
    ? { OR: [comparison, { assignedToUser: { is: null } }] }
    : comparison
}

function assigneeCursorEquality(value: string | null) {
  return value === null
    ? { assignedToUser: { is: null } }
    : { assignedToUser: { is: { fullName: value } } }
}

function getSupportCaseCursorWhere(cursor: SupportCaseCursor) {
  const primaryField =
    cursor.sortField === "latestReply" || cursor.sortField === "updatedAt"
      ? "updatedAt"
      : cursor.sortField === "linkedRecord"
        ? "linkedRecordType"
        : cursor.sortField
  const primaryType =
    primaryField === "createdAt" || primaryField === "updatedAt"
      ? "date"
      : "string"
  const primaryDirection = cursor.direction
  const secondaryDirection =
    cursor.sortField === "latestReply" || cursor.sortField === "updatedAt"
      ? cursor.direction
      : "desc"
  const idDirection =
    cursor.sortField === "latestReply" || cursor.sortField === "updatedAt"
      ? cursor.direction
      : "desc"
  const primaryAfter =
    cursor.sortField === "assignedToUser"
      ? assigneeCursorCondition(primaryDirection, cursor.primary)
      : scalarCursorCondition(
          primaryField,
          primaryDirection,
          cursor.primary,
          primaryType
        )
  const primaryEqual =
    cursor.sortField === "assignedToUser"
      ? assigneeCursorEquality(cursor.primary)
      : scalarCursorEquality(primaryField, cursor.primary, primaryType)
  const secondaryField =
    cursor.sortField === "latestReply" || cursor.sortField === "updatedAt"
      ? "createdAt"
      : "updatedAt"
  const secondaryValue =
    secondaryField === "createdAt" ? cursor.createdAt : cursor.updatedAt

  return {
    OR: [
      ...(primaryAfter ? [primaryAfter] : []),
      {
        AND: [
          primaryEqual,
          scalarCursorCondition(
            secondaryField,
            secondaryDirection,
            secondaryValue,
            "date"
          ),
        ],
      },
      {
        AND: [
          primaryEqual,
          scalarCursorEquality(secondaryField, secondaryValue, "date"),
          scalarCursorCondition("id", idDirection, cursor.id),
        ],
      },
    ],
  }
}

function getSupportCaseWhere(input: {
  assignedToUserId?: string
  category?: SupportCaseCategory
  fromDate?: Date
  memberId?: string
  priority?: SupportCasePriority
  search?: string
  status?: SupportCaseStatus
  tenantId: string
  toDate?: Date
}) {
  return {
    tenantId: input.tenantId,
    ...(input.fromDate || input.toDate
      ? {
          createdAt: {
            ...(input.fromDate ? { gte: input.fromDate } : {}),
            ...(input.toDate ? { lte: input.toDate } : {}),
          },
        }
      : {}),
    ...(input.assignedToUserId
      ? { assignedToUserId: input.assignedToUserId }
      : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.memberId ? { memberId: input.memberId } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.search && {
      OR: [
        {
          subject: {
            contains: input.search,
            mode: "insensitive" as const,
          },
        },
        {
          description: {
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
        {
          assignedToUser: {
            is: {
              OR: [
                {
                  fullName: {
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

export async function listSupportCasePage(
  input: {
    tenantId: string
  } & ListSupportCasePageFilters,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const page = input.page ?? 1
  const pageSize = input.pageSize ?? input.limit ?? 50
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Support case page size must be a positive whole number.",
    })
  }
  const cursor = input.cursor
    ? decodeSupportCaseCursor(input.cursor, input.sort)
    : null
  const baseWhere = getSupportCaseWhere(input)
  const where = cursor
    ? { AND: [baseWhere, getSupportCaseCursorWhere(cursor)] }
    : baseWhere
  const [supportCases, total] = await Promise.all([
    prisma.supportCase.findMany({
      include: supportCaseInclude(),
      orderBy: getSupportCaseOrderBy(input.sort),
      ...(cursor ? {} : { skip: (page - 1) * pageSize }),
      take: pageSize + 1,
      where,
    }),
    prisma.supportCase.count({ where: baseWhere }),
  ])

  const data = supportCases.slice(0, pageSize)
  return {
    data: data.map(normalizeSupportCase),
    meta: {
      cursor:
        supportCases.length > pageSize && data.length > 0
          ? encodeSupportCaseCursor(data[data.length - 1], input.sort)
          : undefined,
      total,
    },
  }
}

export async function getSupportCaseSummary(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<SupportCaseSummary> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) {
    return {
      closedCases: 0,
      featureRequestOpenCases: 0,
      highPriorityOpenCases: 0,
      openCases: 0,
      totalCases: 0,
      urgentOpenCases: 0,
    }
  }

  const [
    totalCases,
    openCases,
    closedCases,
    highPriorityOpenCases,
    urgentOpenCases,
    featureRequestOpenCases,
  ] = await Promise.all([
    prisma.supportCase.count({ where: { tenantId } }),
    prisma.supportCase.count({
      where: { status: { in: openSupportCaseStatuses }, tenantId },
    }),
    prisma.supportCase.count({
      where: { status: { in: ["resolved", "closed"] }, tenantId },
    }),
    prisma.supportCase.count({
      where: {
        priority: { in: ["high", "urgent"] },
        status: { in: openSupportCaseStatuses },
        tenantId,
      },
    }),
    prisma.supportCase.count({
      where: {
        priority: "urgent",
        status: { in: openSupportCaseStatuses },
        tenantId,
      },
    }),
    prisma.supportCase.count({
      where: {
        category: "feature_request",
        status: { in: openSupportCaseStatuses },
        tenantId,
      },
    }),
  ])

  return {
    closedCases,
    featureRequestOpenCases,
    highPriorityOpenCases,
    openCases,
    totalCases,
    urgentOpenCases,
  }
}

export async function getMemberSupportCaseSummary(
  input: {
    memberId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<SupportCaseSummary> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) {
    return {
      closedCases: 0,
      featureRequestOpenCases: 0,
      highPriorityOpenCases: 0,
      openCases: 0,
      totalCases: 0,
      urgentOpenCases: 0,
    }
  }

  const where = {
    memberId: input.memberId,
    tenantId: input.tenantId,
  }
  const [
    totalCases,
    openCases,
    closedCases,
    highPriorityOpenCases,
    urgentOpenCases,
    featureRequestOpenCases,
  ] = await Promise.all([
    prisma.supportCase.count({ where }),
    prisma.supportCase.count({
      where: { ...where, status: { in: openSupportCaseStatuses } },
    }),
    prisma.supportCase.count({
      where: { ...where, status: { in: ["resolved", "closed"] } },
    }),
    prisma.supportCase.count({
      where: {
        ...where,
        priority: { in: ["high", "urgent"] },
        status: { in: openSupportCaseStatuses },
      },
    }),
    prisma.supportCase.count({
      where: {
        ...where,
        priority: "urgent",
        status: { in: openSupportCaseStatuses },
      },
    }),
    prisma.supportCase.count({
      where: {
        ...where,
        category: "feature_request",
        status: { in: openSupportCaseStatuses },
      },
    }),
  ])

  return {
    closedCases,
    featureRequestOpenCases,
    highPriorityOpenCases,
    openCases,
    totalCases,
    urgentOpenCases,
  }
}

export async function createSupportCase(
  input: {
    assignedToUserId?: string | null
    attachmentUrl?: string | null
    category: SupportCaseCategory
    description: string
    linkedRecordId?: string | null
    linkedRecordType?: SupportCaseLinkedRecordType | null
    memberId?: string | null
    moneyImpactRequested?: boolean
    openedByAuthorType?: SupportCaseMessageAuthorType
    openedByUserId?: string | null
    priority?: SupportCasePriority
    subject: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<SupportCaseRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const subject = trimRequired(input.subject, "Support case subject")
  const description = trimRequired(
    input.description,
    "Support case description"
  )
  const attachmentUrl = supportAttachmentUrl(input.attachmentUrl)
  const priority = input.priority ?? "normal"
  const openedByAuthorType =
    input.openedByAuthorType ?? (input.openedByUserId ? "staff" : "system")

  assertChoice(input.category, supportCaseCategories, "Support category")
  assertChoice(priority, supportCasePriorities, "Support priority")
  assertChoice(
    openedByAuthorType,
    supportCaseMessageAuthorTypes,
    "Case opener author type"
  )

  if (openedByAuthorType === "member" && !input.memberId) {
    throw new AppError({
      code: "PRECONDITION_FAILED",
      publicMessage: "Member-opened support cases must be linked to a member.",
    })
  }

  if (input.linkedRecordType) {
    assertChoice(
      input.linkedRecordType,
      supportCaseLinkedRecordTypes,
      "Linked record type"
    )
  }

  await assertMemberBelongsToTenant(input, prisma)
  await assertLinkedRecordBelongsToTenant(input, prisma)
  await assertUserBelongsToTenant(
    {
      label: "Case opener",
      tenantId: input.tenantId,
      userId: input.openedByUserId,
    },
    prisma
  )
  await assertUserBelongsToTenant(
    {
      label: "Assigned user",
      tenantId: input.tenantId,
      userId: input.assignedToUserId,
    },
    prisma
  )

  return prisma.$transaction(async (tx: any) => {
    const supportCase = await tx.supportCase.create({
      data: {
        assignedToUserId: input.assignedToUserId ?? null,
        category: input.category,
        description,
        linkedRecordId: input.linkedRecordId ?? null,
        linkedRecordType: input.linkedRecordType ?? null,
        memberId: input.memberId ?? null,
        moneyImpactRequested: input.moneyImpactRequested ?? false,
        openedByUserId: input.openedByUserId ?? null,
        priority,
        subject,
        tenantId: input.tenantId,
      },
      include: supportCaseInclude(),
    })

    const initialMessage = await tx.supportCaseMessage.create({
      data: {
        attachmentUrl,
        authorType: openedByAuthorType,
        authorUserId: input.openedByUserId ?? null,
        message: description,
        supportCaseId: supportCase.id,
        tenantId: input.tenantId,
      },
    })

    await claimDashboardEvidenceUploadLink(
      {
        tenantId: input.tenantId,
        url: attachmentUrl,
        purpose: "support_attachment",
        entityId: initialMessage.id,
        claimantUserId: input.openedByUserId,
      },
      tx
    )

    await createAuditLogEntry(
      {
        action: "support.case_created",
        actorType: input.openedByUserId ? "user" : "system",
        actorUserId: input.openedByUserId ?? null,
        entityId: supportCase.id,
        entityType: "SupportCase",
        metadata: {
          assignedToUserId: input.assignedToUserId ?? null,
          attachmentUrl,
          category: input.category,
          linkedRecordId: input.linkedRecordId ?? null,
          linkedRecordType: input.linkedRecordType ?? null,
          memberId: input.memberId ?? null,
          moneyImpactRequested: input.moneyImpactRequested ?? false,
          openedByAuthorType,
          priority,
          subject,
        },
        tenantId: input.tenantId,
      },
      tx
    )

    const created = await tx.supportCase.findFirst({
      include: supportCaseInclude(),
      where: {
        id: supportCase.id,
        tenantId: input.tenantId,
      },
    })

    return normalizeSupportCase(created)
  })
}

export async function createMemberSupportCase(
  input: {
    attachmentUrl?: string | null
    category: SupportCaseCategory
    description: string
    linkedRecordId?: string | null
    linkedRecordType?: SupportCaseLinkedRecordType | null
    memberId: string
    moneyImpactRequested?: boolean
    openedByUserId: string
    subject: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<SupportCaseRow> {
  return createSupportCase(
    {
      attachmentUrl: input.attachmentUrl,
      category: input.category,
      description: input.description,
      linkedRecordId: input.linkedRecordId,
      linkedRecordType: input.linkedRecordType,
      memberId: input.memberId,
      moneyImpactRequested: input.moneyImpactRequested,
      openedByAuthorType: "member",
      openedByUserId: input.openedByUserId,
      priority: "normal",
      subject: input.subject,
      tenantId: input.tenantId,
    },
    prismaOverride
  )
}

export async function addSupportCaseMessage(
  input: {
    attachmentUrl?: string | null
    authorType?: SupportCaseMessageAuthorType
    authorUserId?: string | null
    expectedStatus?: SupportCaseStatus
    memberId?: string
    message: string
    supportCaseId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<SupportCaseMessageRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  const message = trimRequired(input.message, "Support message")
  const attachmentUrl = supportAttachmentUrl(input.attachmentUrl)
  const authorType =
    input.authorType ?? (input.authorUserId ? "staff" : "system")
  assertChoice(authorType, supportCaseMessageAuthorTypes, "Message author type")

  await assertUserBelongsToTenant(
    {
      label: "Message author",
      tenantId: input.tenantId,
      userId: input.authorUserId,
    },
    prisma
  )
  const supportCase = await readSupportCase(input, prisma)

  if (input.expectedStatus && supportCase.status !== input.expectedStatus) {
    throw new AppError({
      code: "CONFLICT",
      publicMessage: `Support case changed from ${input.expectedStatus} to ${supportCase.status}. Refresh before replying.`,
    })
  }

  if (supportCase.status === "closed") {
    throw new AppError({
      code: "CONFLICT",
      publicMessage: "Closed support cases cannot receive new messages.",
    })
  }

  return prisma.$transaction(async (tx: any) => {
    const created = await tx.supportCaseMessage.create({
      data: {
        attachmentUrl,
        authorType,
        authorUserId: input.authorUserId ?? null,
        message,
        supportCaseId: input.supportCaseId,
        tenantId: input.tenantId,
      },
      include: {
        authorUser: {
          select: { email: true, fullName: true, id: true },
        },
      },
    })
    await claimDashboardEvidenceUploadLink(
      {
        tenantId: input.tenantId,
        url: attachmentUrl,
        purpose: "support_attachment",
        entityId: created.id,
        claimantUserId: input.authorUserId,
      },
      tx
    )
    await createAuditLogEntry(
      {
        action: "support.message_added",
        actorType: input.authorUserId ? "user" : "system",
        actorUserId: input.authorUserId ?? null,
        entityId: input.supportCaseId,
        entityType: "SupportCase",
        metadata: { authorType, messageId: created.id },
        tenantId: input.tenantId,
      },
      tx
    )
    return normalizeSupportCaseMessage(created)
  })
}

export async function addMemberSupportCaseMessage(
  input: {
    attachmentUrl?: string | null
    authorUserId: string
    memberId: string
    message: string
    supportCaseId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<SupportCaseMessageRow> {
  return addSupportCaseMessage(
    {
      attachmentUrl: input.attachmentUrl,
      authorType: "member",
      authorUserId: input.authorUserId,
      memberId: input.memberId,
      message: input.message,
      supportCaseId: input.supportCaseId,
      tenantId: input.tenantId,
    },
    prismaOverride
  )
}

export async function updateSupportCaseStatus(
  input: {
    actorUserId?: string | null
    assignedToUserId?: string | null
    expectedStatus?: SupportCaseStatus
    priority?: SupportCasePriority
    requiresFinancialAdjustment?: boolean
    resolutionSummary?: string | null
    status: SupportCaseStatus
    supportCaseId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<SupportCaseRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  assertChoice(input.status, supportCaseStatuses, "Support status")

  if (input.priority) {
    assertChoice(input.priority, supportCasePriorities, "Support priority")
  }

  await assertUserBelongsToTenant(
    {
      label: "Case reviewer",
      tenantId: input.tenantId,
      userId: input.actorUserId,
    },
    prisma
  )
  await assertUserBelongsToTenant(
    {
      label: "Assigned user",
      tenantId: input.tenantId,
      userId: input.assignedToUserId,
    },
    prisma
  )

  const existing = await readSupportCase(input, prisma)

  if (input.expectedStatus && existing.status !== input.expectedStatus) {
    throw new AppError({
      code: "CONFLICT",
      publicMessage: `Support case changed from ${input.expectedStatus} to ${existing.status}. Refresh before updating it.`,
    })
  }

  if (existing.status === "closed" && input.status !== "closed") {
    throw new AppError({
      code: "CONFLICT",
      publicMessage:
        "Closed support cases cannot be reopened. Open a new linked case instead.",
    })
  }

  if (
    existing.specialSavingsWithdrawal &&
    input.status !== "resolved" &&
    input.status !== "closed"
  ) {
    throw new AppError({
      code: "CONFLICT",
      publicMessage:
        "A support case with a posted refund cannot return to an active status.",
    })
  }
  const resolutionSummary = input.resolutionSummary?.trim() || null
  const now = new Date()
  const resolving = input.status === "resolved" || input.status === "closed"
  const nextRequiresFinancialAdjustment =
    input.requiresFinancialAdjustment ?? existing.requiresFinancialAdjustment
  const existingFinancialAdjustmentApprovalStatus =
    existing.financialAdjustmentApprovalStatus ??
    (existing.requiresFinancialAdjustment ? "pending" : "not_required")
  const nextFinancialAdjustmentApprovalStatus =
    input.requiresFinancialAdjustment === undefined
      ? existingFinancialAdjustmentApprovalStatus
      : input.requiresFinancialAdjustment
        ? existing.requiresFinancialAdjustment
          ? existingFinancialAdjustmentApprovalStatus
          : "pending"
        : "not_required"

  if (resolving && !resolutionSummary && !existing.resolutionSummary) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Resolution summary is required before closing a case.",
    })
  }

  if (
    resolving &&
    nextRequiresFinancialAdjustment &&
    nextFinancialAdjustmentApprovalStatus !== "approved"
  ) {
    throw new AppError({
      code: "PRECONDITION_FAILED",
      publicMessage:
        "Financial adjustment approval is required before resolving a money-impact support case.",
    })
  }

  const updateData = {
    ...(input.assignedToUserId !== undefined
      ? { assignedToUserId: input.assignedToUserId }
      : {}),
    ...(input.priority ? { priority: input.priority } : {}),
    ...(input.requiresFinancialAdjustment !== undefined
      ? {
          requiresFinancialAdjustment: input.requiresFinancialAdjustment,
          financialAdjustmentApprovalNotes: input.requiresFinancialAdjustment
            ? undefined
            : null,
          financialAdjustmentApprovalStatus:
            nextFinancialAdjustmentApprovalStatus,
          financialAdjustmentApprovedAt: input.requiresFinancialAdjustment
            ? undefined
            : null,
          financialAdjustmentApprovedByUserId: input.requiresFinancialAdjustment
            ? undefined
            : null,
        }
      : {}),
    ...(resolutionSummary ? { resolutionSummary } : {}),
    ...(input.status === "resolved" && !existing.resolvedAt
      ? { resolvedAt: now }
      : {}),
    ...(input.status === "closed" && !existing.closedAt
      ? { closedAt: now }
      : {}),
    status: input.status,
  }
  const claim = await prisma.supportCase.updateMany({
    data: updateData,
    where: {
      id: input.supportCaseId,
      status: existing.status,
      tenantId: input.tenantId,
    },
  })

  if (claim.count !== 1) {
    throw new AppError({
      code: "CONFLICT",
      publicMessage:
        "Support case changed during this update. Refresh before retrying.",
    })
  }

  const updated = await prisma.supportCase.findFirst({
    include: supportCaseInclude(),
    where: { id: input.supportCaseId, tenantId: input.tenantId },
  })

  if (!updated) {
    throw new AppError({
      code: "NOT_FOUND",
      publicMessage: "Support case was not found.",
    })
  }

  await createAuditLogEntry(
    {
      action: "support.case_status_updated",
      actorType: input.actorUserId ? "user" : "system",
      actorUserId: input.actorUserId ?? null,
      entityId: input.supportCaseId,
      entityType: "SupportCase",
      metadata: {
        assignedToUserId:
          input.assignedToUserId === undefined
            ? existing.assignedToUserId
            : input.assignedToUserId,
        nextStatus: input.status,
        previousStatus: existing.status,
        priority: input.priority ?? existing.priority,
        requiresFinancialAdjustment: nextRequiresFinancialAdjustment,
        financialAdjustmentApprovalStatus:
          nextFinancialAdjustmentApprovalStatus,
        resolutionSummary,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return normalizeSupportCase(updated)
}

export async function reviewSupportCaseFinancialAdjustment(
  input: {
    actorUserId: string
    approvalNotes?: string | null
    approvalStatus: Exclude<
      SupportFinancialAdjustmentApprovalStatus,
      "not_required" | "pending"
    >
    expectedApprovalStatus?: SupportFinancialAdjustmentApprovalStatus
    expectedStatus?: SupportCaseStatus
    supportCaseId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<SupportCaseRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  assertChoice(
    input.approvalStatus,
    supportFinancialAdjustmentApprovalStatuses,
    "Financial adjustment approval status"
  )

  if (
    input.approvalStatus !== "approved" &&
    input.approvalStatus !== "rejected"
  ) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage:
        "Financial adjustment review must be approved or rejected.",
    })
  }

  await assertUserBelongsToTenant(
    {
      label: "Financial adjustment reviewer",
      tenantId: input.tenantId,
      userId: input.actorUserId,
    },
    prisma
  )
  const existing = await readSupportCase(input, prisma)

  if (input.expectedStatus && existing.status !== input.expectedStatus) {
    throw new AppError({
      code: "CONFLICT",
      publicMessage: `Support case changed from ${input.expectedStatus} to ${existing.status}. Refresh before reviewing it.`,
    })
  }

  if (
    input.expectedApprovalStatus &&
    existing.financialAdjustmentApprovalStatus !== input.expectedApprovalStatus
  ) {
    throw new AppError({
      code: "CONFLICT",
      publicMessage:
        "Financial adjustment evidence changed after this review opened. Refresh before deciding.",
    })
  }

  if (existing.status === "closed" || existing.specialSavingsWithdrawal) {
    throw new AppError({
      code: "CONFLICT",
      publicMessage:
        "Financial adjustment review is not available for a completed support case.",
    })
  }

  if (!existing.requiresFinancialAdjustment) {
    throw new AppError({
      code: "PRECONDITION_FAILED",
      publicMessage:
        "Financial adjustment approval is only available when the support case requires an adjustment.",
    })
  }

  const approvalNotes = input.approvalNotes?.trim() || null
  const reviewedAt = new Date()
  const claim = await prisma.supportCase.updateMany({
    data: {
      financialAdjustmentApprovalNotes: approvalNotes,
      financialAdjustmentApprovalStatus: input.approvalStatus,
      financialAdjustmentApprovedAt: reviewedAt,
      financialAdjustmentApprovedByUserId: input.actorUserId,
    },
    where: {
      id: input.supportCaseId,
      financialAdjustmentApprovalStatus:
        existing.financialAdjustmentApprovalStatus,
      status: existing.status,
      tenantId: input.tenantId,
    },
  })

  if (claim.count !== 1) {
    throw new AppError({
      code: "CONFLICT",
      publicMessage:
        "Financial adjustment evidence changed during review. Refresh before retrying.",
    })
  }

  const updated = await prisma.supportCase.findFirst({
    include: supportCaseInclude(),
    where: { id: input.supportCaseId, tenantId: input.tenantId },
  })
  if (!updated) {
    throw new AppError({
      code: "NOT_FOUND",
      publicMessage: "Support case was not found.",
    })
  }

  await createAuditLogEntry(
    {
      action: "support.financial_adjustment_reviewed",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: input.supportCaseId,
      entityType: "SupportCase",
      metadata: {
        approvalNotes,
        nextApprovalStatus: input.approvalStatus,
        previousApprovalStatus:
          existing.financialAdjustmentApprovalStatus ??
          (existing.requiresFinancialAdjustment ? "pending" : "not_required"),
        requiresFinancialAdjustment: existing.requiresFinancialAdjustment,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return normalizeSupportCase(updated)
}
