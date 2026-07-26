import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"

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
    throw new Error(`${label} is required.`)
  }

  return trimmed
}

function assertChoice(value: string, validValues: Set<string>, label: string) {
  if (!validValues.has(value)) {
    throw new Error(`${label} is not supported.`)
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
    financialAdjustmentApprovedByUser: supportCase.financialAdjustmentApprovedByUser
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
    throw new Error("Member does not belong to this cooperative.")
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
    throw new Error(`${input.label} does not belong to this cooperative.`)
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
    throw new Error("Linked record type and id are required together.")
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
    throw new Error("Linked receipt does not belong to this member profile.")
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
    throw new Error("Support case was not found.")
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

function getSupportCaseWhere(
  input: {
    assignedToUserId?: string
    category?: SupportCaseCategory
    fromDate?: Date
    memberId?: string
    priority?: SupportCasePriority
    search?: string
    status?: SupportCaseStatus
    tenantId: string
    toDate?: Date
  }
) {
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
    throw new Error("Support case page size must be a positive whole number.")
  }

  const where = getSupportCaseWhere(input)
  const [supportCases, total] = await Promise.all([
    prisma.supportCase.findMany({
      include: supportCaseInclude(),
      orderBy: getSupportCaseOrderBy(input.sort),
      ...(input.cursor
        ? { cursor: { id: input.cursor }, skip: 1 }
        : { skip: (page - 1) * pageSize }),
      take: pageSize,
      where,
    }),
    prisma.supportCase.count({ where }),
  ])

  return {
    data: supportCases.map(normalizeSupportCase),
    meta: {
      cursor:
        supportCases.length === pageSize
          ? (supportCases.at(-1)?.id as string | undefined)
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
    throw new Error("Member-opened support cases must be linked to a member.")
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

    await tx.supportCaseMessage.create({
      data: {
        attachmentUrl: input.attachmentUrl?.trim() || null,
        authorType: openedByAuthorType,
        authorUserId: input.openedByUserId ?? null,
        message: description,
        supportCaseId: supportCase.id,
        tenantId: input.tenantId,
      },
    })

    await createAuditLogEntry(
      {
        action: "support.case_created",
        actorType: input.openedByUserId ? "user" : "system",
        actorUserId: input.openedByUserId ?? null,
        entityId: supportCase.id,
        entityType: "SupportCase",
        metadata: {
          assignedToUserId: input.assignedToUserId ?? null,
          attachmentUrl: input.attachmentUrl?.trim() || null,
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
  const authorType = input.authorType ?? (input.authorUserId ? "staff" : "system")
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

  if (supportCase.status === "closed") {
    throw new Error("Closed support cases cannot receive new messages.")
  }

  const created = await prisma.supportCaseMessage.create({
    data: {
      attachmentUrl: input.attachmentUrl?.trim() || null,
      authorType,
      authorUserId: input.authorUserId ?? null,
      message,
      supportCaseId: input.supportCaseId,
      tenantId: input.tenantId,
    },
    include: {
      authorUser: {
        select: {
          email: true,
          fullName: true,
          id: true,
        },
      },
    },
  })

  await createAuditLogEntry(
    {
      action: "support.message_added",
      actorType: input.authorUserId ? "user" : "system",
      actorUserId: input.authorUserId ?? null,
      entityId: input.supportCaseId,
      entityType: "SupportCase",
      metadata: {
        authorType,
        messageId: created.id,
      },
      tenantId: input.tenantId,
    },
    prisma
  )

  return normalizeSupportCaseMessage(created)
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
  const resolutionSummary = input.resolutionSummary?.trim() || null
  const now = new Date()
  const resolving =
    input.status === "resolved" || input.status === "closed"
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
    throw new Error("Resolution summary is required before closing a case.")
  }

  if (
    resolving &&
    nextRequiresFinancialAdjustment &&
    nextFinancialAdjustmentApprovalStatus !== "approved"
  ) {
    throw new Error(
      "Financial adjustment approval is required before resolving a money-impact support case."
    )
  }

  const updated = await prisma.supportCase.update({
    data: {
      ...(input.assignedToUserId !== undefined
        ? { assignedToUserId: input.assignedToUserId }
        : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.requiresFinancialAdjustment !== undefined
        ? {
            requiresFinancialAdjustment:
              input.requiresFinancialAdjustment,
            financialAdjustmentApprovalNotes:
              input.requiresFinancialAdjustment ? undefined : null,
            financialAdjustmentApprovalStatus:
              nextFinancialAdjustmentApprovalStatus,
            financialAdjustmentApprovedAt:
              input.requiresFinancialAdjustment ? undefined : null,
            financialAdjustmentApprovedByUserId:
              input.requiresFinancialAdjustment ? undefined : null,
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
    },
    include: supportCaseInclude(),
    where: {
      id: input.supportCaseId,
    },
  })

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
        requiresFinancialAdjustment:
          nextRequiresFinancialAdjustment,
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
    throw new Error("Financial adjustment review must be approved or rejected.")
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

  if (!existing.requiresFinancialAdjustment) {
    throw new Error(
      "Financial adjustment approval is only available when the support case requires an adjustment."
    )
  }

  const approvalNotes = input.approvalNotes?.trim() || null
  const reviewedAt = new Date()
  const updated = await prisma.supportCase.update({
    data: {
      financialAdjustmentApprovalNotes: approvalNotes,
      financialAdjustmentApprovalStatus: input.approvalStatus,
      financialAdjustmentApprovedAt: reviewedAt,
      financialAdjustmentApprovedByUserId: input.actorUserId,
    },
    include: supportCaseInclude(),
    where: {
      id: input.supportCaseId,
    },
  })

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
