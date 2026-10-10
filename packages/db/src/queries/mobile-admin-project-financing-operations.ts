import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { runMobileAdminCommand } from "./mobile-admin-finance-support"
import {
  activateProjectFinancingRequest,
  findProjectFinancingRequest,
  getProjectFinancingSummary,
  listProjectFinancingRequestPage,
  recordProjectFinancingDisbursement,
  reviewProjectFinancingRequest,
  type ProjectFinancingRequestRow,
  type ProjectFinancingRequestStatus,
  type ProjectFinancingStructure,
} from "./project-financing"

export const mobileAdminProjectFinancingLanes = [
  "needs_action",
  "active",
  "closed",
] as const

export type MobileAdminProjectFinancingLane =
  (typeof mobileAdminProjectFinancingLanes)[number]

export type MobileAdminProjectFinancingCapabilities = {
  activate: boolean
  recordDisbursement: boolean
  review: boolean
  view: boolean
}

type ProjectFinancingAction = "activate" | "record_disbursement" | "review"

function getPrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  return prisma
}

function fingerprint(value: Record<string, unknown>) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
    )
  )
}

function outstandingPrincipal(request: ProjectFinancingRequestRow) {
  if (request.approvedStructure !== "repayable_facility") return null
  return Math.max(0, (request.approvedAmount ?? 0) - request.paidAmount)
}

function attentionFor(request: ProjectFinancingRequestRow) {
  if (request.status === "submitted" || request.status === "under_review") {
    return {
      label:
        request.approvedStructure === "undecided" ||
        request.proposedStructure === "undecided"
          ? "Activation locked · structure review required"
          : "Review decision required",
      severity: "blocked" as const,
    }
  }

  if (request.status === "approved") {
    return {
      label: "Approved structure is ready to activate",
      severity: "ready" as const,
    }
  }

  if (request.status === "active" && !request.disbursedAt) {
    return {
      label: "Release evidence is missing",
      severity: "warning" as const,
    }
  }

  return null
}

function serializeProjectFinancingRequest(
  request: ProjectFinancingRequestRow,
  capabilities: MobileAdminProjectFinancingCapabilities
) {
  const approvedStructure = request.approvedStructure
  const isRepayable = approvedStructure === "repayable_facility"
  const allowedActions: ProjectFinancingAction[] = []

  if (
    capabilities.review &&
    (request.status === "submitted" || request.status === "under_review")
  ) {
    allowedActions.push("review")
  }
  if (capabilities.activate && request.status === "approved") {
    allowedActions.push("activate")
  }
  if (
    capabilities.recordDisbursement &&
    request.status === "active" &&
    !request.disbursedAt
  ) {
    allowedActions.push("record_disbursement")
  }

  return {
    allowedActions,
    approvedAmount: request.approvedAmount,
    approvedMonthlyPayback: isRepayable ? request.approvedMonthlyPayback : null,
    approvedPaybackMonths: isRepayable ? request.approvedPaybackMonths : null,
    approvedStructure,
    attention: attentionFor(request),
    boundary: isRepayable ? "repayable_principal" : "evidence_only",
    businessDescription: request.businessDescription,
    businessName: request.businessName,
    disbursedAt: request.disbursedAt?.toISOString() ?? null,
    disbursedByUser: request.disbursedByUser
      ? {
          fullName: request.disbursedByUser.fullName,
          id: request.disbursedByUser.id,
        }
      : null,
    disbursementNotes: request.disbursementNotes,
    disbursementReference: request.disbursementReference,
    id: request.id,
    member: {
      fullName: request.member.fullName,
      id: request.member.id,
      memberNumber: request.member.memberNumber,
    },
    outstandingPrincipal: outstandingPrincipal(request),
    paidAmount: isRepayable ? request.paidAmount : null,
    paidAt: isRepayable ? (request.paidAt?.toISOString() ?? null) : null,
    projectPurpose: request.projectPurpose,
    proposedStructure: request.proposedStructure,
    requestedAmount: request.requestedAmount,
    requestedAt: request.requestedAt.toISOString(),
    requestedPaybackMonths: request.requestedPaybackMonths,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    reviewedByUser: request.reviewedByUser
      ? {
          fullName: request.reviewedByUser.fullName,
          id: request.reviewedByUser.id,
        }
      : null,
    reviewNotes: request.reviewNotes,
    status: request.status,
    updatedAt: request.updatedAt.toISOString(),
  }
}

function laneFilters(lane: MobileAdminProjectFinancingLane) {
  if (lane === "needs_action") return { requiresAction: true }
  if (lane === "active") {
    return {
      disbursementState: "recorded" as const,
      status: "active" as const,
    }
  }
  return {
    statuses: [
      "cancelled",
      "completed",
      "rejected",
    ] satisfies ProjectFinancingRequestStatus[],
  }
}

export async function getMobileAdminProjectFinancingWorkspace(
  input: {
    capabilities: MobileAdminProjectFinancingCapabilities
    cursor?: string
    lane: MobileAdminProjectFinancingLane
    search?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const filters = laneFilters(input.lane)
  const [
    tenant,
    page,
    attentionPage,
    summary,
    blockedCount,
    activationReady,
    releaseReady,
    closedCount,
  ] = await Promise.all([
    prisma.tenant.findUnique({
      select: { currencyCode: true },
      where: { id: input.tenantId },
    }),
    listProjectFinancingRequestPage(
      {
        ...filters,
        cursor: input.cursor,
        pageSize: 30,
        search: input.search,
        tenantId: input.tenantId,
      },
      prisma
    ),
    listProjectFinancingRequestPage(
      {
        pageSize: 4,
        requiresAction: true,
        tenantId: input.tenantId,
      },
      prisma
    ),
    getProjectFinancingSummary(input.tenantId, prisma),
    prisma.projectFinancingRequest.count({
      where: {
        status: { in: ["submitted", "under_review"] },
        tenantId: input.tenantId,
      },
    }),
    prisma.projectFinancingRequest.count({
      where: { status: "approved", tenantId: input.tenantId },
    }),
    prisma.projectFinancingRequest.count({
      where: {
        disbursedAt: null,
        status: "active",
        tenantId: input.tenantId,
      },
    }),
    prisma.projectFinancingRequest.count({
      where: {
        status: { in: ["cancelled", "completed", "rejected"] },
        tenantId: input.tenantId,
      },
    }),
  ])

  return {
    attention: attentionPage.data.map((request: ProjectFinancingRequestRow) =>
      serializeProjectFinancingRequest(request, input.capabilities)
    ),
    capabilities: input.capabilities,
    currencyCode: tenant?.currencyCode ?? "NGN",
    generatedAt: new Date().toISOString(),
    lane: input.lane,
    nextCursor: page.meta.cursor ?? null,
    projects: page.data.map((request: ProjectFinancingRequestRow) =>
      serializeProjectFinancingRequest(request, input.capabilities)
    ),
    summary: {
      blockedCount,
      closedCount,
      outstandingPrincipal: summary.outstandingAmount,
      readyCount: activationReady + releaseReady,
      totalProjects: summary.totalRequests,
    },
    total: page.meta.total,
  }
}

export async function getMobileAdminProjectFinancingDetail(
  input: {
    capabilities: MobileAdminProjectFinancingCapabilities
    projectFinancingRequestId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const request = await findProjectFinancingRequest(
    {
      projectFinancingRequestId: input.projectFinancingRequestId,
      tenantId: input.tenantId,
    },
    prisma
  )
  if (!request) {
    throw ExpectedQueryError.notFound("Project financing request not found.")
  }

  const [activationAudit, repaymentAllocations] = await Promise.all([
    prisma.auditLog.findFirst({
      include: {
        actorUser: { select: { fullName: true, id: true } },
      },
      orderBy: { occurredAt: "desc" },
      where: {
        action: "project_financing.structure_activated",
        entityId: request.id,
        entityType: "ProjectFinancingRequest",
        tenantId: input.tenantId,
      },
    }),
    request.approvedStructure === "repayable_facility"
      ? prisma.memberPaymentReceiptAllocation.findMany({
          orderBy: { createdAt: "desc" },
          select: {
            amount: true,
            createdAt: true,
            id: true,
            receipt: {
              select: {
                paidAt: true,
                paymentReference: true,
                reviewedAt: true,
              },
            },
          },
          take: 20,
          where: {
            projectFinancingRequestId: request.id,
            receipt: { is: { status: "approved" } },
            tenantId: input.tenantId,
          },
        })
      : Promise.resolve([]),
  ])
  const activationMetadata = activationAudit?.metadata as Record<
    string,
    unknown
  > | null

  return {
    activation: activationAudit
      ? {
          activatedAt: activationAudit.occurredAt.toISOString(),
          actor: activationAudit.actorUser,
          notes:
            typeof activationMetadata?.notes === "string"
              ? activationMetadata.notes
              : null,
        }
      : null,
    project: serializeProjectFinancingRequest(request, input.capabilities),
    repayments: repaymentAllocations.map((allocation) => ({
      amount: Number(allocation.amount),
      id: allocation.id,
      paidAt: allocation.receipt.paidAt.toISOString(),
      paymentReference: allocation.receipt.paymentReference,
      postedAt: (
        allocation.receipt.reviewedAt ?? allocation.createdAt
      ).toISOString(),
    })),
  }
}

export function reviewMobileAdminProjectFinancingOperation(input: {
  actorUserId: string
  approvedAmount?: number | null
  approvedPaybackMonths?: number | null
  approvedStructure?: ProjectFinancingStructure | null
  commandId: string
  expectedState: "submitted" | "under_review"
  notes?: string | null
  projectFinancingRequestId: string
  status: "approved" | "rejected" | "under_review"
  tenantId: string
}) {
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: `project_financing.review.${input.status}`,
    entityId: input.projectFinancingRequestId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const request = await reviewProjectFinancingRequest(
        {
          ...input,
          expectedStatus: input.expectedState,
        },
        prisma
      )
      return { id: request.id, state: request.status }
    },
  })
}

export function activateMobileAdminProjectFinancing(input: {
  actorUserId: string
  commandId: string
  expectedState: "approved"
  notes?: string | null
  projectFinancingRequestId: string
  tenantId: string
}) {
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: "project_financing.activate",
    entityId: input.projectFinancingRequestId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const request = await activateProjectFinancingRequest(
        {
          actorUserId: input.actorUserId,
          expectedStatus: input.expectedState,
          notes: input.notes,
          projectFinancingRequestId: input.projectFinancingRequestId,
          tenantId: input.tenantId,
        },
        prisma
      )
      return { id: request.id, state: request.status }
    },
  })
}

export function recordMobileAdminProjectFinancingDisbursement(input: {
  actorUserId: string
  commandId: string
  disbursedAt: string
  expectedState: "active"
  notes?: string | null
  projectFinancingRequestId: string
  reference?: string | null
  tenantId: string
}) {
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: "project_financing.disbursement.record",
    entityId: input.projectFinancingRequestId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const request = await recordProjectFinancingDisbursement(
        {
          ...input,
          disbursedAt: new Date(`${input.disbursedAt}T12:00:00.000Z`),
          expectedStatus: input.expectedState,
        },
        prisma
      )
      return { id: request.id, state: request.status }
    },
  })
}
