import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { createAuditLogEntry } from "./audit"
import { applyApplicableWorkflowChargesInTransaction } from "./charges"
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

type UserPreview = {
  email: string
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
  approvedRequests: number
  pendingRequests: number
  rejectedRequests: number
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
    throw new Error(`${label} is required.`)
  }

  return trimmed
}

function trimOptional(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function assertPositiveAmount(value: number | null | undefined, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`)
  }
}

function assertPositiveInteger(
  value: number | null | undefined,
  label: string
) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive whole number.`)
  }
}

function calculateMonthlyPayback(amount: number, months: number | null) {
  if (!months) return null

  return Math.ceil((amount / months) * 100) / 100
}

function normalizeUserPreview(user: any): UserPreview {
  return {
    email: user.email,
    fullName: user.fullName,
    id: user.id,
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
    throw new Error(
      "Live financial record writes are locked until initial migration is finalized."
    )
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
    throw new Error("Project financing actor does not belong to this tenant.")
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
    throw new Error(
      "Project financing member does not belong to this cooperative."
    )
  }
}

function normalizeStructure(
  value?: ProjectFinancingStructure | null
): ProjectFinancingStructure {
  const structure = value ?? "undecided"

  if (!projectFinancingStructures.has(structure)) {
    throw new Error("Project financing structure is not supported.")
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
    throw new Error("Project financing request was not found.")
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
    throw new Error("Project financing request status is not supported.")
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

export async function getProjectFinancingSummary(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<ProjectFinancingSummary> {
  const prisma = (prismaOverride ?? createPrismaClient()) as any
  if (!prisma || typeof prisma.projectFinancingRequest?.count !== "function") {
    return {
      approvedRequests: 0,
      pendingRequests: 0,
      rejectedRequests: 0,
      totalApprovedAmount: 0,
      totalRequestedAmount: 0,
    }
  }

  const [
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    requestedTotals,
    approvedTotals,
  ] = await Promise.all([
    prisma.projectFinancingRequest.count({
      where: {
        status: { in: [...pendingProjectFinancingStatuses] },
        tenantId,
      },
    }),
    prisma.projectFinancingRequest.count({
      where: {
        status: { in: [...approvedProjectFinancingStatuses] },
        tenantId,
      },
    }),
    prisma.projectFinancingRequest.count({
      where: { status: "rejected", tenantId },
    }),
    prisma.projectFinancingRequest.aggregate({
      _sum: { requestedAmount: true },
      where: { tenantId },
    }),
    prisma.projectFinancingRequest.aggregate({
      _sum: { approvedAmount: true },
      where: {
        status: { in: [...approvedProjectFinancingStatuses] },
        tenantId,
      },
    }),
  ])

  return {
    approvedRequests,
    pendingRequests,
    rejectedRequests,
    totalApprovedAmount: Number(approvedTotals._sum.approvedAmount ?? 0),
    totalRequestedAmount: Number(requestedTotals._sum.requestedAmount ?? 0),
  }
}

export async function createProjectFinancingRequest(
  input: {
    actorUserId: string
    businessDescription?: string | null
    businessName: string
    memberId: string
    projectPurpose?: string | null
    proposedStructure?: ProjectFinancingStructure | null
    requestedAmount: number
    requestedPaybackMonths?: number | null
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

  const businessName = trimRequired(input.businessName, "Business name")
  const proposedStructure = normalizeStructure(input.proposedStructure)
  assertPositiveAmount(input.requestedAmount, "Requested project amount")

  if (input.requestedPaybackMonths != null) {
    assertPositiveInteger(
      input.requestedPaybackMonths,
      "Requested payback months"
    )
  }

  const estimatedMonthlyPayback = calculateMonthlyPayback(
    input.requestedAmount,
    input.requestedPaybackMonths ?? null
  )

  return prisma.$transaction(async (tx: any) => {
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
        requestedAt: new Date(),
        requestedPaybackMonths: input.requestedPaybackMonths ?? null,
        status: "submitted",
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
  })
}

export async function reviewProjectFinancingRequest(
  input: {
    actorUserId: string
    approvedAmount?: number | null
    approvedPaybackMonths?: number | null
    approvedStructure?: ProjectFinancingStructure | null
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
    throw new Error("Project financing request status is not supported.")
  }

  return prisma.$transaction(async (tx: any) => {
    const existingRequest = await readProjectFinancingRequest(
      {
        projectFinancingRequestId: input.projectFinancingRequestId,
        tenantId: input.tenantId,
      },
      tx
    )

    if (!["submitted", "under_review"].includes(existingRequest.status)) {
      throw new Error(
        "Only pending project financing requests can be reviewed."
      )
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
        throw new Error(
          "Project financing structure must be clarified before approval."
        )
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

    const request = await tx.projectFinancingRequest.update({
      where: { id: existingRequest.id },
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
      include: projectFinancingInclude(),
    })

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

    if (existingRequest.status !== "approved") {
      throw new Error(
        "Only approved project financing requests can be recorded as disbursed."
      )
    }

    const approvedAmount = Number(existingRequest.approvedAmount ?? 0)
    if (approvedAmount <= 0) {
      throw new Error(
        "Project financing needs an approved amount before disbursement."
      )
    }

    const disbursedAt = input.disbursedAt ?? new Date()
    const reference = trimOptional(input.reference)
    const notes = trimOptional(input.notes)
    const request = await tx.projectFinancingRequest.update({
      where: { id: existingRequest.id },
      data: {
        disbursedAt,
        disbursedByUserId: input.actorUserId,
        disbursementNotes: notes,
        disbursementReference: reference,
        status: "active",
      },
      include: projectFinancingInclude(),
    })

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
