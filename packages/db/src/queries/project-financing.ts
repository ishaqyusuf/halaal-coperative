import type { PrismaClient } from "../../generated/prisma/client"
import { AppError } from "@halaalvest/errors"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError, isUniqueConstraintError } from "../query-error"
import { createAuditLogEntry } from "./audit"
import {
  applyApplicableWorkflowChargesInTransaction,
  getApplicableChargeQuoteHash,
  quoteApplicableCharges,
} from "./charges"
import { getTenantInitialMigrationState } from "./migration"

export type ProjectFinancingStructure =
  | "investment_partnership"
  | "profit_sharing"
  | "repayable_facility"
  | "undecided"

export type ProjectFinancingRequestStatus =
  | "active"
  | "approved"
  | "cancelled"
  | "completed"
  | "rejected"
  | "submitted"
  | "under_review"

export type ProjectFinancingRequestSortField =
  | "approvedAmount"
  | "businessName"
  | "disbursedAt"
  | "estimatedMonthlyPayback"
  | "memberName"
  | "requestedAmount"
  | "requestedAt"
  | "status"

export type ListProjectFinancingRequestPageFilters = {
  cursor?: string | null
  disbursementState?: "missing" | "recorded"
  limit?: number
  memberId?: string
  page?: number
  pageSize?: number
  requiresAction?: boolean
  search?: string
  sort?: [ProjectFinancingRequestSortField, "asc" | "desc"] | null
  status?: ProjectFinancingRequestStatus
  statuses?: ProjectFinancingRequestStatus[]
}

type UserPreview = {
  email: string | null
  fullName: string
  id: string
}

export type ProjectFinancingRequestRow = {
  approvedAmount: number | null
  approvedMonthlyPayback: number | null
  approvedPaybackMonths: number | null
  approvedStructure: ProjectFinancingStructure | null
  businessDescription: string | null
  businessName: string
  createdAt: Date
  createdByUser: UserPreview
  createdByUserId: string
  disbursedAt: Date | null
  disbursedByUser: UserPreview | null
  disbursedByUserId: string | null
  disbursementNotes: string | null
  disbursementReference: string | null
  estimatedMonthlyPayback: number | null
  id: string
  member: {
    email: string | null
    fullName: string
    id: string
    memberNumber: string
  }
  memberId: string
  paidAmount: number
  paidAt: Date | null
  projectPurpose: string | null
  proposedStructure: ProjectFinancingStructure
  requestedAmount: number
  requestedAt: Date
  requestedPaybackMonths: number | null
  reviewedAt: Date | null
  reviewedByUser: UserPreview | null
  reviewedByUserId: string | null
  reviewNotes: string | null
  status: ProjectFinancingRequestStatus
  updatedAt: Date
}

export type ProjectFinancingSummary = {
  activeRequests: number
  approvedRequests: number
  outstandingAmount: number
  pendingRequests: number
  rejectedRequests: number
  totalRequests: number
  totalApprovedAmount: number
  totalRequestedAmount: number
}

const projectFinancingRequestStatuses = new Set([
  "active",
  "approved",
  "cancelled",
  "completed",
  "rejected",
  "submitted",
  "under_review",
])

const projectFinancingStructures = new Set([
  "investment_partnership",
  "profit_sharing",
  "repayable_facility",
  "undecided",
])

const pendingProjectFinancingStatuses = ["submitted", "under_review"] as const
const approvedProjectFinancingStatuses = [
  "approved",
  "active",
  "completed",
] as const

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

function trimOptional(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function assertPositiveAmount(value: number | null | undefined, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: `${label} must be greater than zero.`,
    })
  }
}

function assertPositiveInteger(
  value: number | null | undefined,
  label: string
) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: `${label} must be a positive whole number.`,
    })
  }
}

function calculateMonthlyPayback(amount: number, months: number | null) {
  if (!months) return null

  return Math.ceil((amount / months) * 100) / 100
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function normalizeUserPreview(user: any): UserPreview {
  return {
    email: user.email ?? null,
    fullName: user.fullName,
    id: user.id,
  }
}

/**
 * The member portal needs workflow evidence, but not staff contact details.
 * Keep the shape stable for shared UI while removing every email preview.
 */
export function redactProjectFinancingRequestForMember(
  request: ProjectFinancingRequestRow
): ProjectFinancingRequestRow {
  return {
    ...request,
    createdByUser: { ...request.createdByUser, email: null },
    disbursedByUser: request.disbursedByUser
      ? { ...request.disbursedByUser, email: null }
      : null,
    member: { ...request.member, email: null },
    reviewedByUser: request.reviewedByUser
      ? { ...request.reviewedByUser, email: null }
      : null,
  }
}

function normalizeProjectFinancingRequest(
  request: any
): ProjectFinancingRequestRow {
  return {
    approvedAmount:
      request.approvedAmount === null || request.approvedAmount === undefined
        ? null
        : Number(request.approvedAmount),
    approvedMonthlyPayback:
      request.approvedMonthlyPayback === null ||
      request.approvedMonthlyPayback === undefined
        ? null
        : Number(request.approvedMonthlyPayback),
    approvedPaybackMonths: request.approvedPaybackMonths ?? null,
    approvedStructure: request.approvedStructure ?? null,
    businessDescription: request.businessDescription ?? null,
    businessName: request.businessName,
    createdAt: request.createdAt,
    createdByUser: normalizeUserPreview(request.createdByUser),
    createdByUserId: request.createdByUserId,
    disbursedAt: request.disbursedAt ?? null,
    disbursedByUser: request.disbursedByUser
      ? normalizeUserPreview(request.disbursedByUser)
      : null,
    disbursedByUserId: request.disbursedByUserId ?? null,
    disbursementNotes: request.disbursementNotes ?? null,
    disbursementReference: request.disbursementReference ?? null,
    estimatedMonthlyPayback:
      request.estimatedMonthlyPayback === null ||
      request.estimatedMonthlyPayback === undefined
        ? null
        : Number(request.estimatedMonthlyPayback),
    id: request.id,
    member: {
      email: request.member.email ?? null,
      fullName: request.member.fullName,
      id: request.member.id,
      memberNumber: request.member.memberNumber,
    },
    memberId: request.memberId,
    paidAmount:
      request.paidAmount === null || request.paidAmount === undefined
        ? 0
        : Number(request.paidAmount),
    paidAt: request.paidAt ?? null,
    projectPurpose: request.projectPurpose ?? null,
    proposedStructure: request.proposedStructure,
    requestedAmount: Number(request.requestedAmount),
    requestedAt: request.requestedAt,
    requestedPaybackMonths: request.requestedPaybackMonths ?? null,
    reviewedAt: request.reviewedAt ?? null,
    reviewedByUser: request.reviewedByUser
      ? normalizeUserPreview(request.reviewedByUser)
      : null,
    reviewedByUserId: request.reviewedByUserId ?? null,
    reviewNotes: request.reviewNotes ?? null,
    status: request.status,
    updatedAt: request.updatedAt,
  }
}

function userSelect() {
  return {
    email: true,
    fullName: true,
    id: true,
  } as const
}

function projectFinancingInclude() {
  return {
    createdByUser: {
      select: userSelect(),
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
      select: userSelect(),
    },
    disbursedByUser: {
      select: userSelect(),
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

async function assertActorBelongsToTenant(
  input: {
    actorUserId: string
    tenantId: string
  },
  prisma: any
) {
  if (typeof prisma.user?.findFirst !== "function") {
    return
  }

  const user = await prisma.user.findFirst({
    select: { id: true },
    where: {
      id: input.actorUserId,
      memberships: {
        some: {
          tenantId: input.tenantId,
        },
      },
    },
  })

  if (!user) {
    throw new AppError({
      code: "PERMISSION_DENIED",
      publicMessage: "Project financing actor does not belong to this tenant.",
    })
  }
}

async function assertMemberBelongsToTenant(
  input: {
    memberId: string
    tenantId: string
  },
  prisma: any
) {
  const member = await prisma.member.findFirst({
    select: { id: true },
    where: {
      id: input.memberId,
      status: "active",
      tenantId: input.tenantId,
    },
  })

  if (!member) {
    throw new AppError({
      code: "NOT_FOUND",
      publicMessage:
        "Project financing member does not belong to this cooperative.",
    })
  }
}

function normalizeStructure(
  value?: ProjectFinancingStructure | null
): ProjectFinancingStructure {
  const structure = value ?? "undecided"

  if (!projectFinancingStructures.has(structure)) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Select a supported project financing structure.",
    })
  }

  return structure
}

async function readProjectFinancingRequest(
  input: {
    projectFinancingRequestId: string
    tenantId: string
  },
  prisma: any
) {
  const request = await prisma.projectFinancingRequest.findFirst({
    include: projectFinancingInclude(),
    where: {
      id: input.projectFinancingRequestId,
      tenantId: input.tenantId,
    },
  })

  if (!request) {
    throw new AppError({
      code: "NOT_FOUND",
      publicMessage: "Project financing request was not found.",
    })
  }

  return request
}

export async function listProjectFinancingRequests(
  input: {
    limit?: number
    memberId?: string
    status?: ProjectFinancingRequestStatus
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ProjectFinancingRequestRow[]> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return []

  if (typeof prisma.projectFinancingRequest?.findMany !== "function") {
    return []
  }

  if (input.status && !projectFinancingRequestStatuses.has(input.status)) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Project financing request status is not supported.",
    })
  }

  const requests = await prisma.projectFinancingRequest.findMany({
    include: projectFinancingInclude(),
    orderBy: [{ requestedAt: "desc" }, { createdAt: "desc" }],
    take: input.limit ?? 50,
    where: {
      tenantId: input.tenantId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
  })

  return requests.map(normalizeProjectFinancingRequest)
}

export async function findProjectFinancingRequest(
  input: {
    memberId?: string
    projectFinancingRequestId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ProjectFinancingRequestRow | null> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) return null

  if (typeof prisma.projectFinancingRequest?.findFirst !== "function") {
    return null
  }

  const request = await prisma.projectFinancingRequest.findFirst({
    include: projectFinancingInclude(),
    where: {
      id: input.projectFinancingRequestId,
      ...(input.memberId ? { memberId: input.memberId } : {}),
      tenantId: input.tenantId,
    },
  })

  return request ? normalizeProjectFinancingRequest(request) : null
}

function getProjectFinancingRequestOrderBy(
  sort?: [ProjectFinancingRequestSortField, "asc" | "desc"] | null
) {
  const [sortField, direction] = normalizeProjectFinancingRequestSort(sort)

  if (sortField === "memberName") {
    return [
      { member: { fullName: direction } },
      { requestedAt: "desc" as const },
      { id: "desc" as const },
    ]
  }

  if (
    sortField === "approvedAmount" ||
    sortField === "disbursedAt" ||
    sortField === "estimatedMonthlyPayback"
  ) {
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

type ProjectFinancingRequestPageCursor = {
  approvedAmount: number | null
  businessName: string
  createdAt: string
  disbursedAt: string | null
  estimatedMonthlyPayback: number | null
  id: string
  memberName: string
  requestedAmount: number
  requestedAt: string
  sortDirection: "asc" | "desc"
  sortField: Exclude<ProjectFinancingRequestSortField, "status">
}

function normalizeProjectFinancingRequestSort(
  sort?: [ProjectFinancingRequestSortField, "asc" | "desc"] | null
) {
  const [sortField, direction] = sort ?? ["requestedAt", "desc"]

  return [
    sortField === "status" ? "requestedAt" : sortField,
    direction,
  ] as const
}

function encodeProjectFinancingRequestPageCursor(
  cursor: ProjectFinancingRequestPageCursor
) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url")
}

function decodeProjectFinancingRequestPageCursor(
  value: string,
  sort?: [ProjectFinancingRequestSortField, "asc" | "desc"] | null
) {
  try {
    const cursor = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as ProjectFinancingRequestPageCursor
    const [sortField, sortDirection] =
      normalizeProjectFinancingRequestSort(sort)

    if (
      !cursor ||
      cursor.sortField !== sortField ||
      cursor.sortDirection !== sortDirection ||
      typeof cursor.id !== "string" ||
      typeof cursor.businessName !== "string" ||
      typeof cursor.memberName !== "string" ||
      typeof cursor.requestedAmount !== "number" ||
      (typeof cursor.approvedAmount !== "number" &&
        cursor.approvedAmount !== null) ||
      (typeof cursor.estimatedMonthlyPayback !== "number" &&
        cursor.estimatedMonthlyPayback !== null) ||
      (typeof cursor.disbursedAt !== "string" && cursor.disbursedAt !== null) ||
      Number.isNaN(new Date(cursor.createdAt).getTime()) ||
      Number.isNaN(new Date(cursor.requestedAt).getTime()) ||
      (cursor.disbursedAt !== null &&
        Number.isNaN(new Date(cursor.disbursedAt).getTime()))
    ) {
      throw ExpectedQueryError.validation("Invalid cursor")
    }

    return cursor
  } catch {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Project financing request cursor is invalid.",
    })
  }
}

export function createProjectFinancingRequestPageCursor(
  request: ProjectFinancingRequestRow,
  sort?: [ProjectFinancingRequestSortField, "asc" | "desc"] | null
) {
  const [sortField, sortDirection] = normalizeProjectFinancingRequestSort(sort)

  return encodeProjectFinancingRequestPageCursor({
    approvedAmount: request.approvedAmount,
    businessName: request.businessName,
    createdAt: request.createdAt.toISOString(),
    disbursedAt: request.disbursedAt?.toISOString() ?? null,
    estimatedMonthlyPayback: request.estimatedMonthlyPayback,
    id: request.id,
    memberName: request.member.fullName,
    requestedAmount: request.requestedAmount,
    requestedAt: request.requestedAt.toISOString(),
    sortDirection,
    sortField,
  })
}

function cursorComparison(value: unknown, direction: "asc" | "desc") {
  return direction === "asc" ? { gt: value } : { lt: value }
}

function nullableCursorComparison(
  field: "approvedAmount" | "disbursedAt" | "estimatedMonthlyPayback",
  value: Date | number | null,
  direction: "asc" | "desc"
) {
  if (value === null) return null

  return {
    OR: [{ [field]: cursorComparison(value, direction) }, { [field]: null }],
  }
}

function getProjectFinancingRequestPageKeysetWhere(input: {
  cursor: ProjectFinancingRequestPageCursor
  sort?: [ProjectFinancingRequestSortField, "asc" | "desc"] | null
}): any {
  const [sortField, sortDirection] = normalizeProjectFinancingRequestSort(
    input.sort
  )
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
    sortField === "memberName"
      ? cursor.memberName
      : sortField === "disbursedAt"
        ? cursor.disbursedAt
          ? new Date(cursor.disbursedAt)
          : null
        : cursor[sortField]
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
      : sortField === "approvedAmount" ||
          sortField === "disbursedAt" ||
          sortField === "estimatedMonthlyPayback"
        ? nullableCursorComparison(
            sortField,
            primaryValue as Date | number | null,
            sortDirection
          )
        : { [sortField]: cursorComparison(primaryValue, sortDirection) }

  return {
    OR: [
      ...(primaryAfter ? [primaryAfter] : []),
      { AND: [primaryEquals, requestedAtTieBreak] },
    ],
  }
}

function getProjectFinancingRequestWhere(input: {
  disbursementState?: "missing" | "recorded"
  memberId?: string
  requiresAction?: boolean
  search?: string
  status?: ProjectFinancingRequestStatus
  statuses?: ProjectFinancingRequestStatus[]
  tenantId: string
}) {
  const actionWhere = input.requiresAction
    ? {
        OR: [
          { status: { in: ["approved", "submitted", "under_review"] } },
          { disbursedAt: null, status: "active" },
        ],
      }
    : null
  const searchWhere = input.search
    ? {
        OR: [
          {
            businessName: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          },
          {
            businessDescription: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          },
          {
            projectPurpose: {
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
      }
    : null

  return {
    tenantId: input.tenantId,
    ...(input.memberId ? { memberId: input.memberId } : {}),
    ...(input.status
      ? { status: input.status }
      : input.statuses?.length
        ? { status: { in: input.statuses } }
        : {}),
    ...(input.disbursementState === "missing"
      ? { disbursedAt: null }
      : input.disbursementState === "recorded"
        ? { disbursedAt: { not: null } }
        : {}),
    ...(actionWhere || searchWhere
      ? { AND: [actionWhere, searchWhere].filter(Boolean) }
      : {}),
  }
}

export async function listProjectFinancingRequestPage(
  input: {
    tenantId: string
  } & ListProjectFinancingRequestPageFilters,
  prismaOverride?: PrismaClient
) {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (typeof prisma.projectFinancingRequest?.findMany !== "function") {
    return { data: [], meta: { cursor: undefined, total: 0 } }
  }

  if (input.status && !projectFinancingRequestStatuses.has(input.status)) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Project financing request status is not supported.",
    })
  }

  if (
    input.statuses?.some(
      (status) => !projectFinancingRequestStatuses.has(status)
    )
  ) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Project financing request status is not supported.",
    })
  }

  if (input.status && input.statuses?.length) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage:
        "Filter project financing requests by one status or a status group, not both.",
    })
  }

  const pageSize = input.pageSize ?? input.limit ?? 50
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage:
        "Project financing request page size must be a positive whole number.",
    })
  }

  const where = getProjectFinancingRequestWhere(input)
  const cursor = input.cursor
    ? decodeProjectFinancingRequestPageCursor(input.cursor, input.sort)
    : null
  const pageWhere: any = cursor
    ? {
        AND: [
          where,
          getProjectFinancingRequestPageKeysetWhere({
            cursor,
            sort: input.sort,
          }),
        ],
      }
    : where
  const [requests, total] = await Promise.all([
    prisma.projectFinancingRequest.findMany({
      include: projectFinancingInclude(),
      orderBy: getProjectFinancingRequestOrderBy(input.sort),
      ...(cursor ? {} : { skip: ((input.page ?? 1) - 1) * pageSize }),
      take: pageSize + 1,
      where: pageWhere,
    }),
    prisma.projectFinancingRequest.count({ where }),
  ])

  const data = requests.slice(0, pageSize).map(normalizeProjectFinancingRequest)

  return {
    data,
    meta: {
      cursor:
        requests.length > pageSize
          ? data.at(-1)
            ? createProjectFinancingRequestPageCursor(data.at(-1)!, input.sort)
            : undefined
          : undefined,
      total,
    },
  }
}

export async function getProjectFinancingSummary(
  tenantId: string,
  prismaOverride?: PrismaClient,
  memberId?: string
): Promise<ProjectFinancingSummary> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma || typeof prisma.projectFinancingRequest?.count !== "function") {
    return {
      activeRequests: 0,
      approvedRequests: 0,
      outstandingAmount: 0,
      pendingRequests: 0,
      rejectedRequests: 0,
      totalRequests: 0,
      totalApprovedAmount: 0,
      totalRequestedAmount: 0,
    }
  }

  const [
    activeRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    totalRequests,
    requestedTotals,
    approvedTotals,
    repayableApprovedTotals,
    paymentTotals,
  ] = await Promise.all([
    prisma.projectFinancingRequest.count({
      where: {
        status: "active",
        tenantId,
        ...(memberId ? { memberId } : {}),
      },
    }),
    prisma.projectFinancingRequest.count({
      where: {
        status: { in: [...pendingProjectFinancingStatuses] },
        tenantId,
        ...(memberId ? { memberId } : {}),
      },
    }),
    prisma.projectFinancingRequest.count({
      where: {
        status: { in: [...approvedProjectFinancingStatuses] },
        tenantId,
        ...(memberId ? { memberId } : {}),
      },
    }),
    prisma.projectFinancingRequest.count({
      where: {
        status: "rejected",
        tenantId,
        ...(memberId ? { memberId } : {}),
      },
    }),
    prisma.projectFinancingRequest.count({
      where: { tenantId, ...(memberId ? { memberId } : {}) },
    }),
    prisma.projectFinancingRequest.aggregate({
      _sum: { requestedAmount: true },
      where: { tenantId, ...(memberId ? { memberId } : {}) },
    }),
    prisma.projectFinancingRequest.aggregate({
      _sum: { approvedAmount: true },
      where: {
        status: { in: [...approvedProjectFinancingStatuses] },
        tenantId,
        ...(memberId ? { memberId } : {}),
      },
    }),
    prisma.projectFinancingRequest.aggregate({
      _sum: { approvedAmount: true },
      where: {
        approvedStructure: "repayable_facility",
        status: { in: [...approvedProjectFinancingStatuses] },
        tenantId,
        ...(memberId ? { memberId } : {}),
      },
    }),
    prisma.projectFinancingRequest.aggregate({
      _sum: { paidAmount: true },
      where: {
        approvedStructure: "repayable_facility",
        status: { in: [...approvedProjectFinancingStatuses] },
        tenantId,
        ...(memberId ? { memberId } : {}),
      },
    }),
  ])

  const totalApprovedAmount = Number(approvedTotals._sum.approvedAmount ?? 0)
  const repayableApprovedAmount = Number(
    repayableApprovedTotals._sum.approvedAmount ?? 0
  )

  return {
    activeRequests,
    approvedRequests,
    outstandingAmount: roundMoney(
      Math.max(
        repayableApprovedAmount - Number(paymentTotals._sum.paidAmount ?? 0),
        0
      )
    ),
    pendingRequests,
    rejectedRequests,
    totalRequests,
    totalApprovedAmount,
    totalRequestedAmount: Number(requestedTotals._sum.requestedAmount ?? 0),
  }
}

export async function activateProjectFinancingRequest(
  input: {
    actorUserId: string
    expectedStatus: "approved"
    notes?: string | null
    projectFinancingRequestId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ProjectFinancingRequestRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  await assertActorBelongsToTenant(input, prisma)

  return prisma.$transaction(async (tx: any) => {
    const existingRequest = await readProjectFinancingRequest(
      {
        projectFinancingRequestId: input.projectFinancingRequestId,
        tenantId: input.tenantId,
      },
      tx
    )

    if (existingRequest.status !== input.expectedStatus) {
      throw new AppError({
        code: "CONFLICT",
        publicMessage: `Project financing request changed from ${input.expectedStatus} to ${existingRequest.status}. Refresh before activating.`,
      })
    }

    const approvedStructure = existingRequest.approvedStructure
    const approvedAmount = Number(existingRequest.approvedAmount ?? 0)
    if (!approvedStructure || approvedStructure === "undecided") {
      throw new AppError({
        code: "PRECONDITION_FAILED",
        publicMessage:
          "Project financing needs an approved structure before activation.",
      })
    }
    assertPositiveAmount(approvedAmount, "Approved project amount")

    if (approvedStructure === "repayable_facility") {
      assertPositiveInteger(
        existingRequest.approvedPaybackMonths,
        "Approved payback months"
      )
      assertPositiveAmount(
        Number(existingRequest.approvedMonthlyPayback ?? 0),
        "Approved monthly principal payment"
      )
    }

    const activatedAt = new Date()
    const activationNotes = trimOptional(input.notes)
    const claim = await tx.projectFinancingRequest.updateMany({
      data: { status: "active" },
      where: {
        id: existingRequest.id,
        status: input.expectedStatus,
        tenantId: input.tenantId,
      },
    })

    if (claim.count !== 1) {
      throw new AppError({
        code: "CONFLICT",
        publicMessage:
          "Project financing request changed during activation. Refresh before retrying.",
      })
    }

    const request = await tx.projectFinancingRequest.findFirst({
      include: projectFinancingInclude(),
      where: { id: existingRequest.id, tenantId: input.tenantId },
    })
    if (!request) {
      throw new AppError({
        code: "NOT_FOUND",
        publicMessage: "Project financing request was not found.",
      })
    }

    await createAuditLogEntry(
      {
        action: "project_financing.structure_activated",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: request.id,
        entityType: "ProjectFinancingRequest",
        metadata: {
          activatedAt,
          approvedAmount,
          approvedPaybackMonths: request.approvedPaybackMonths,
          approvedStructure,
          memberId: request.memberId,
          notes: activationNotes,
          previousStatus: existingRequest.status,
          status: "active",
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeProjectFinancingRequest(request)
  })
}

export async function createProjectFinancingRequest(
  input: {
    actorUserId: string
    businessDescription?: string | null
    businessName: string
    expectedChargeQuoteHash?: string
    memberId: string
    projectPurpose?: string | null
    proposedStructure?: ProjectFinancingStructure | null
    requestedAmount: number
    requestedPaybackMonths?: number | null
    submissionKey?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ProjectFinancingRequestRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  if (typeof prisma.projectFinancingRequest?.create !== "function") {
    throw new Error(
      "Project financing requests require the latest Prisma migration and generated client."
    )
  }

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  await assertActorBelongsToTenant(input, prisma)
  await assertMemberBelongsToTenant(input, prisma)

  if (
    input.submissionKey &&
    typeof prisma.projectFinancingRequest?.findFirst === "function"
  ) {
    const existingRequest = await prisma.projectFinancingRequest.findFirst({
      include: projectFinancingInclude(),
      where: {
        createdByUserId: input.actorUserId,
        memberId: input.memberId,
        submissionKey: input.submissionKey,
        tenantId: input.tenantId,
      },
    })
    if (existingRequest) {
      return normalizeProjectFinancingRequest(existingRequest)
    }
  }

  const businessName = trimRequired(input.businessName, "Business name")
  const proposedStructure = normalizeStructure(input.proposedStructure)
  assertPositiveAmount(input.requestedAmount, "Requested project amount")

  if (input.requestedPaybackMonths != null) {
    assertPositiveInteger(
      input.requestedPaybackMonths,
      "Requested payback months"
    )
  }

  if (
    proposedStructure === "repayable_facility" &&
    input.requestedPaybackMonths == null
  ) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Repayable facilities require requested payback months.",
    })
  }

  if (
    proposedStructure !== "repayable_facility" &&
    input.requestedPaybackMonths != null
  ) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage:
        "Payback months apply only to repayable project facilities.",
    })
  }

  const estimatedMonthlyPayback = calculateMonthlyPayback(
    input.requestedAmount,
    input.requestedPaybackMonths ?? null
  )
  const requestedAt = new Date()

  try {
    return await prisma.$transaction(
      async (tx: any) => {
        if (input.expectedChargeQuoteHash !== undefined) {
          const currentCharges = await quoteApplicableCharges(
            {
              assessedAt: requestedAt,
              basisAmount: input.requestedAmount,
              tenantId: input.tenantId,
              trigger: "submission",
              workflow: "project_financing_request",
            },
            tx as PrismaClient
          )
          if (
            getApplicableChargeQuoteHash(
              currentCharges,
              input.requestedAmount
            ) !== input.expectedChargeQuoteHash
          ) {
            throw ExpectedQueryError.precondition(
              "Project financing charges changed. Review a fresh quote before submitting."
            )
          }
        }
        const request = await tx.projectFinancingRequest.create({
          data: {
            businessDescription: trimOptional(input.businessDescription),
            businessName,
            createdByUserId: input.actorUserId,
            estimatedMonthlyPayback,
            memberId: input.memberId,
            projectPurpose: trimOptional(input.projectPurpose),
            proposedStructure,
            requestedAmount: input.requestedAmount,
            requestedAt,
            requestedPaybackMonths: input.requestedPaybackMonths ?? null,
            status: "submitted",
            submissionKey: input.submissionKey ?? null,
            tenantId: input.tenantId,
          },
          include: projectFinancingInclude(),
        })

        await createAuditLogEntry(
          {
            action: "project_financing.request_submitted",
            actorType: "user",
            actorUserId: input.actorUserId,
            entityId: request.id,
            entityType: "ProjectFinancingRequest",
            metadata: {
              businessName,
              memberId: input.memberId,
              proposedStructure,
              requestedAmount: input.requestedAmount,
              requestedPaybackMonths: input.requestedPaybackMonths ?? null,
            },
            tenantId: input.tenantId,
          },
          tx
        )

        await applyApplicableWorkflowChargesInTransaction(
          {
            actorUserId: input.actorUserId,
            assessedAt: request.requestedAt,
            basisAmount: Number(request.requestedAmount),
            memberId: request.memberId,
            notes:
              "Automatically applied for project financing request submission.",
            projectFinancingRequestId: request.id,
            tenantId: input.tenantId,
            trigger: "submission",
            workflow: "project_financing_request",
          },
          tx as PrismaClient
        )

        return normalizeProjectFinancingRequest(request)
      },
      { isolationLevel: "Serializable" }
    )
  } catch (error) {
    if (!input.submissionKey || !isUniqueConstraintError(error)) throw error

    const existingRequest = await prisma.projectFinancingRequest.findFirst({
      include: projectFinancingInclude(),
      where: {
        createdByUserId: input.actorUserId,
        memberId: input.memberId,
        submissionKey: input.submissionKey,
        tenantId: input.tenantId,
      },
    })
    if (existingRequest) {
      return normalizeProjectFinancingRequest(existingRequest)
    }

    throw ExpectedQueryError.conflict(
      "This project financing submission key has already been used."
    )
  }
}

export async function reviewProjectFinancingRequest(
  input: {
    actorUserId: string
    approvedAmount?: number | null
    approvedPaybackMonths?: number | null
    approvedStructure?: ProjectFinancingStructure | null
    expectedStatus?: ProjectFinancingRequestStatus
    notes?: string | null
    projectFinancingRequestId: string
    status: "approved" | "rejected" | "under_review"
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ProjectFinancingRequestRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  await assertActorBelongsToTenant(input, prisma)

  if (!projectFinancingRequestStatuses.has(input.status)) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Project financing request status is not supported.",
    })
  }

  return prisma.$transaction(async (tx: any) => {
    const existingRequest = await readProjectFinancingRequest(
      {
        projectFinancingRequestId: input.projectFinancingRequestId,
        tenantId: input.tenantId,
      },
      tx
    )

    if (
      input.expectedStatus &&
      existingRequest.status !== input.expectedStatus
    ) {
      throw new AppError({
        code: "CONFLICT",
        publicMessage: `Project financing request changed from ${input.expectedStatus} to ${existingRequest.status}. Refresh before reviewing.`,
      })
    }

    if (!["submitted", "under_review"].includes(existingRequest.status)) {
      throw new AppError({
        code: "CONFLICT",
        publicMessage:
          "Only pending project financing requests can be reviewed.",
      })
    }

    const approvedStructure =
      input.status === "approved"
        ? normalizeStructure(
            input.approvedStructure ?? existingRequest.proposedStructure
          )
        : null
    const approvedAmount =
      input.status === "approved"
        ? (input.approvedAmount ?? Number(existingRequest.requestedAmount))
        : null
    const approvedPaybackMonths =
      input.status === "approved"
        ? (input.approvedPaybackMonths ??
          existingRequest.requestedPaybackMonths ??
          null)
        : null
    let approvedMonthlyPayback: number | null = null

    if (input.status === "approved") {
      if (approvedStructure === "undecided") {
        throw new AppError({
          code: "VALIDATION_FAILED",
          publicMessage:
            "Project financing structure must be clarified before approval.",
        })
      }

      const approvedRequestAmount =
        approvedAmount ?? Number(existingRequest.requestedAmount)

      assertPositiveAmount(approvedRequestAmount, "Approved project amount")

      if (approvedStructure === "repayable_facility") {
        const approvedRequestPaybackMonths =
          approvedPaybackMonths ?? existingRequest.requestedPaybackMonths

        assertPositiveInteger(
          approvedRequestPaybackMonths,
          "Approved payback months"
        )
        approvedMonthlyPayback = calculateMonthlyPayback(
          approvedRequestAmount,
          approvedRequestPaybackMonths
        )
      }
    }

    const claim = await tx.projectFinancingRequest.updateMany({
      where: {
        id: existingRequest.id,
        status: existingRequest.status,
        tenantId: input.tenantId,
      },
      data: {
        approvedAmount,
        approvedMonthlyPayback,
        approvedPaybackMonths:
          approvedStructure === "repayable_facility"
            ? approvedPaybackMonths
            : null,
        approvedStructure,
        reviewedAt: new Date(),
        reviewedByUserId: input.actorUserId,
        reviewNotes: trimOptional(input.notes),
        status: input.status,
      },
    })

    if (claim.count !== 1) {
      throw new AppError({
        code: "CONFLICT",
        publicMessage:
          "Project financing request changed during review. Refresh before retrying.",
      })
    }

    const request = await tx.projectFinancingRequest.findFirst({
      include: projectFinancingInclude(),
      where: { id: existingRequest.id, tenantId: input.tenantId },
    })
    if (!request) {
      throw new AppError({
        code: "NOT_FOUND",
        publicMessage: "Project financing request was not found.",
      })
    }

    await createAuditLogEntry(
      {
        action: `project_financing.request_${input.status}`,
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: request.id,
        entityType: "ProjectFinancingRequest",
        metadata: {
          approvedAmount,
          approvedPaybackMonths,
          approvedStructure,
          memberId: request.memberId,
          notes: trimOptional(input.notes),
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
          basisAmount: Number(
            request.approvedAmount ?? request.requestedAmount
          ),
          memberId: request.memberId,
          notes:
            "Automatically applied for project financing request approval.",
          projectFinancingRequestId: request.id,
          tenantId: input.tenantId,
          trigger: "approval",
          workflow: "project_financing_request",
        },
        tx as PrismaClient
      )
    }

    return normalizeProjectFinancingRequest(request)
  })
}

export async function recordProjectFinancingDisbursement(
  input: {
    actorUserId: string
    disbursedAt?: Date
    expectedStatus?: "active" | "approved"
    notes?: string | null
    projectFinancingRequestId: string
    reference?: string | null
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<ProjectFinancingRequestRow> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma) throw new Error("Database not configured")

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  await assertActorBelongsToTenant(input, prisma)

  return prisma.$transaction(async (tx: any) => {
    const existingRequest = await readProjectFinancingRequest(
      {
        projectFinancingRequestId: input.projectFinancingRequestId,
        tenantId: input.tenantId,
      },
      tx
    )

    if (
      input.expectedStatus &&
      existingRequest.status !== input.expectedStatus
    ) {
      throw new AppError({
        code: "CONFLICT",
        publicMessage: `Project financing request changed from ${input.expectedStatus} to ${existingRequest.status}. Refresh before recording release evidence.`,
      })
    }

    if (!input.expectedStatus && existingRequest.status !== "approved") {
      throw new AppError({
        code: "CONFLICT",
        publicMessage:
          "Only approved project financing requests can be recorded as disbursed.",
      })
    }

    if (
      input.expectedStatus === "active" &&
      existingRequest.status !== "active"
    ) {
      throw new AppError({
        code: "CONFLICT",
        publicMessage:
          "Activate the approved project structure before recording release evidence.",
      })
    }

    if (existingRequest.disbursedAt) {
      throw new AppError({
        code: "CONFLICT",
        publicMessage:
          "Project financing release evidence has already been recorded.",
      })
    }

    const approvedAmount = Number(existingRequest.approvedAmount ?? 0)
    if (approvedAmount <= 0) {
      throw new AppError({
        code: "PRECONDITION_FAILED",
        publicMessage:
          "Project financing needs an approved amount before disbursement.",
      })
    }

    const disbursedAt = input.disbursedAt ?? new Date()
    const reference = trimOptional(input.reference)
    const notes = trimOptional(input.notes)
    const claim = await tx.projectFinancingRequest.updateMany({
      where: {
        disbursedAt: null,
        id: existingRequest.id,
        status: existingRequest.status,
        tenantId: input.tenantId,
      },
      data: {
        disbursedAt,
        disbursedByUserId: input.actorUserId,
        disbursementNotes: notes,
        disbursementReference: reference,
        status: "active",
      },
    })

    if (claim.count !== 1) {
      throw new AppError({
        code: "CONFLICT",
        publicMessage:
          "Project financing release evidence changed during recording. Refresh before retrying.",
      })
    }

    const request = await tx.projectFinancingRequest.findFirst({
      include: projectFinancingInclude(),
      where: { id: existingRequest.id, tenantId: input.tenantId },
    })
    if (!request) {
      throw new AppError({
        code: "NOT_FOUND",
        publicMessage: "Project financing request was not found.",
      })
    }

    if (existingRequest.status === "approved") {
      await createAuditLogEntry(
        {
          action: "project_financing.structure_activated",
          actorType: "user",
          actorUserId: input.actorUserId,
          entityId: request.id,
          entityType: "ProjectFinancingRequest",
          metadata: {
            activatedAt: disbursedAt,
            approvedAmount,
            approvedPaybackMonths: request.approvedPaybackMonths,
            approvedStructure: request.approvedStructure,
            implicitWithDisbursement: true,
            memberId: request.memberId,
            notes,
            previousStatus: existingRequest.status,
            status: "active",
          },
          tenantId: input.tenantId,
        },
        tx
      )
    }

    await createAuditLogEntry(
      {
        action: "project_financing.disbursement_recorded",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: request.id,
        entityType: "ProjectFinancingRequest",
        metadata: {
          approvedAmount,
          approvedStructure: request.approvedStructure,
          disbursedAt,
          memberId: request.memberId,
          notes,
          previousStatus: existingRequest.status,
          reference,
          status: "active",
        },
        tenantId: input.tenantId,
      },
      tx
    )

    return normalizeProjectFinancingRequest(request)
  })
}
