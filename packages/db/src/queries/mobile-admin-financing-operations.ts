import type { FinancingCycleStatus, PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import {
  getMonthlyFinancingCycleHealth,
  openMonthlyFinancingCycle,
  updateMonthlyFinancingCycleStatus,
} from "./financing-cycles"
import { disburseLoan } from "./loans"
import { runMobileAdminCommand } from "./mobile-admin-finance-support"
import { operationsCursorScope, readOperationsCursor, writeOperationsCursor } from "./mobile-operations-cursor"

export const mobileAdminFinancingLanes = [
  "review",
  "disbursement",
  "activity",
] as const

export type MobileAdminFinancingLane =
  (typeof mobileAdminFinancingLanes)[number]

export type MobileAdminFinancingCapabilities = {
  disburse: boolean
  manageCycle: boolean
  review: boolean
  view: boolean
}

export type MobileAdminFinancingAction = "disburse" | "review"

export type MobileAdminFinancingItem = {
  actions: MobileAdminFinancingAction[]
  amount: number
  approvals: {
    actedAt: string
    actorName: string
    action: string
    id: string
    notes: string | null
  }[]
  blockers: string[]
  evidence: string[]
  id: string
  kind: "loan" | "request"
  loanId: string | null
  loanType: "normal" | "quick"
  member: {
    id: string
    name: string
    number: string
  }
  productName: string
  requestedAt: string
  state: string
  termMonths: number
}

function getPrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  return prisma
}

function commandFingerprint(value: Record<string, unknown>) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(value).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    )
  )
}

function requestBlockers(input: {
  activeFinancingMemberIds: Set<string>
  normalRemainingAmount: number
  quickRemainingAmount: number
  request: any
}) {
  const blockers: string[] = []
  const rejectedGuarantors = input.request.guarantorApprovals.filter(
    (approval: any) => approval.status === "rejected"
  )
  const pendingGuarantors = input.request.guarantorApprovals.filter(
    (approval: any) => approval.status === "pending"
  )
  if (rejectedGuarantors.length) {
    blockers.push(`${rejectedGuarantors.length} guarantor rejected this request.`)
  } else if (pendingGuarantors.length) {
    blockers.push(
      `${pendingGuarantors.length} guarantor ${pendingGuarantors.length === 1 ? "response remains" : "responses remain"}.`
    )
  }
  if (!input.request.loanProduct.isActive) {
    blockers.push("The financing product is no longer active.")
  }
  if (
    Number(input.request.requestedAmount) >
    Number(input.request.eligibleAmountSnapshot)
  ) {
    blockers.push("The request exceeds its eligibility snapshot.")
  }
  if (input.request.requestedTermMonths > input.request.loanProduct.termMonths) {
    blockers.push("The requested term exceeds the product limit.")
  }
  if (
    input.request.loanProduct.loanType === "quick" &&
    input.activeFinancingMemberIds.has(input.request.memberId)
  ) {
    blockers.push("The member has active financing that blocks quick financing.")
  }
  const remaining =
    input.request.loanProduct.loanType === "quick"
      ? input.quickRemainingAmount
      : input.normalRemainingAmount
  const remainingWithThisReservation =
    remaining + Number(input.request.requestedAmount)
  if (remainingWithThisReservation < Number(input.request.requestedAmount)) {
    blockers.push("The cycle allocation no longer covers this reservation.")
  }
  return blockers
}

function mapRequest(
  request: any,
  input: {
    activeFinancingMemberIds: Set<string>
    capabilities: MobileAdminFinancingCapabilities
    normalRemainingAmount: number
    quickRemainingAmount: number
    requiresDualApproval: boolean
  }
): MobileAdminFinancingItem {
  const blockers = requestBlockers({
    activeFinancingMemberIds: input.activeFinancingMemberIds,
    normalRemainingAmount: input.normalRemainingAmount,
    quickRemainingAmount: input.quickRemainingAmount,
    request,
  })
  const approvingActors = new Set(
    request.approvals
      .filter((approval: any) => approval.action === "approved")
      .map((approval: any) => approval.actorUserId)
  )
  const approvalsNeeded = input.requiresDualApproval ? 2 : 1
  const approvalsRemaining = Math.max(0, approvalsNeeded - approvingActors.size)

  return {
    actions:
      input.capabilities.review && ["submitted", "under_review"].includes(request.status)
        ? ["review"]
        : [],
    amount: Number(request.requestedAmount),
    approvals: request.approvals.map((approval: any) => ({
      actedAt: approval.actedAt.toISOString(),
      actorName: approval.actorUser.fullName,
      action: approval.action,
      id: approval.id,
      notes: approval.notes,
    })),
    blockers,
    evidence: [
      `${request.guarantorApprovals.filter((approval: any) => approval.status === "approved").length} of ${request.guarantorApprovals.length} guarantors approved`,
      `${approvalsRemaining} finance approval${approvalsRemaining === 1 ? "" : "s"} remaining`,
      `Eligibility snapshot ${Number(request.eligibleAmountSnapshot).toFixed(0)}`,
      `Pool snapshot ${Number(request.availablePoolSnapshot).toFixed(0)}`,
    ],
    id: request.id,
    kind: "request",
    loanId: request.loan?.id ?? null,
    loanType: request.loanProduct.loanType,
    member: {
      id: request.member.id,
      name: request.member.fullName,
      number: request.member.memberNumber,
    },
    productName: request.loanProduct.name,
    requestedAt: request.requestedAt.toISOString(),
    state: request.loan?.status ?? request.status,
    termMonths: request.requestedTermMonths,
  }
}

function mapLoan(
  loan: any,
  input: {
    capabilities: MobileAdminFinancingCapabilities
    deployableFunds: number
  }
): MobileAdminFinancingItem {
  const amount = Number(loan.principalAmount)
  const fundsAvailableForThisLoan = input.deployableFunds + amount
  const blockers =
    amount > fundsAvailableForThisLoan
      ? [
          `Deployable funds available for this release are ${fundsAvailableForThisLoan.toFixed(0)}.`,
        ]
      : []

  return {
    actions:
      input.capabilities.disburse && loan.status === "approved"
        ? ["disburse"]
        : [],
    amount,
    approvals: loan.loanRequest.approvals.map((approval: any) => ({
      actedAt: approval.actedAt.toISOString(),
      actorName: approval.actorUser.fullName,
      action: approval.action,
      id: approval.id,
      notes: approval.notes,
    })),
    blockers,
    evidence: [
      "Approval reserves cycle capacity but does not guarantee disbursement.",
      `Fresh deployable-funds check: ${fundsAvailableForThisLoan.toFixed(0)} available for this release.`,
      `${loan.loanRequest.guarantorApprovals.filter((approval: any) => approval.status === "approved").length} guarantor approvals recorded.`,
    ],
    id: loan.id,
    kind: "loan",
    loanId: loan.id,
    loanType: loan.loanProduct.loanType,
    member: {
      id: loan.member.id,
      name: loan.member.fullName,
      number: loan.member.memberNumber,
    },
    productName: loan.loanProduct.name,
    requestedAt: loan.loanRequest.requestedAt.toISOString(),
    state: loan.status,
    termMonths: loan.termMonths,
  }
}

const requestInclude = {
  approvals: {
    include: { actorUser: { select: { fullName: true } } },
    orderBy: { actedAt: "asc" },
  },
  guarantorApprovals: {
    include: {
      guarantorMember: {
        select: { fullName: true, id: true, memberNumber: true },
      },
    },
    orderBy: { requestedAt: "asc" },
  },
  loan: { select: { id: true, status: true } },
  loanProduct: true,
  member: { select: { fullName: true, id: true, memberNumber: true } },
} as const

const loanInclude = {
  loanProduct: true,
  loanRequest: {
    include: {
      approvals: {
        include: { actorUser: { select: { fullName: true } } },
        orderBy: { actedAt: "asc" },
      },
      guarantorApprovals: { orderBy: { requestedAt: "asc" } },
    },
  },
  member: { select: { fullName: true, id: true, memberNumber: true } },
} as const

export async function getMobileAdminFinancingOperationsWorkspace(
  input: {
    capabilities: MobileAdminFinancingCapabilities
    cursor?: string | null
    entityId?: string
    lane: MobileAdminFinancingLane
    search?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const scope = operationsCursorScope(input, "financing")
  const cursor = readOperationsCursor(input.cursor, scope)
  const [tenant, health, policy, activeFinancing] = await Promise.all([
    prisma.tenant.findUnique({
      select: { currencyCode: true },
      where: { id: input.tenantId },
    }),
    getMonthlyFinancingCycleHealth({ tenantId: input.tenantId }, prisma),
    prisma.tenantPolicy.findUnique({ where: { tenantId: input.tenantId } }),
    prisma.loan.findMany({
      select: { memberId: true },
      where: {
        status: { in: ["approved", "disbursed", "active"] },
        tenantId: input.tenantId,
      },
    }),
  ])
  const activeFinancingMemberIds = new Set(
    activeFinancing.map((loan) => loan.memberId)
  )
  const searchFilter = input.search
    ? {
        member: {
          OR: [
            { fullName: { contains: input.search, mode: "insensitive" as const } },
            {
              memberNumber: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          ],
        },
      }
    : {}

  let items: MobileAdminFinancingItem[]
  let nextCursor: string | null = null
  if (input.lane === "disbursement") {
    const loans = await prisma.loan.findMany({
      include: loanInclude,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 51,
      where: {
        ...searchFilter,
        ...(input.entityId ? { id: input.entityId } : {}),
        ...(cursor ? { AND: [{ OR: [
          { createdAt: { gt: cursor.at } },
          { createdAt: cursor.at, id: { gt: cursor.id } },
        ] }] } : {}),
        status: "approved",
        tenantId: input.tenantId,
      },
    })
    const page = loans.slice(0, 50)
    const last = page.at(-1)
    if (loans.length > 50 && last) nextCursor = writeOperationsCursor(scope, last.id, last.createdAt)
    items = page.map((loan) =>
      mapLoan(loan, {
        capabilities: input.capabilities,
        deployableFunds: health.deployableFunds.deployableFunds,
      })
    )
  } else {
    const requests = await prisma.loanRequest.findMany({
      include: requestInclude,
      orderBy: [
        { requestedAt: input.lane === "review" ? "asc" : "desc" },
        { id: input.lane === "review" ? "asc" : "desc" },
      ],
      take: 51,
      where: {
        ...searchFilter,
        ...(input.entityId ? { OR: [
          { id: input.entityId },
          { loan: { is: { id: input.entityId } } },
        ] } : {}),
        ...(cursor ? { AND: [{ OR: input.lane === "review" ? [
          { requestedAt: { gt: cursor.at } },
          { requestedAt: cursor.at, id: { gt: cursor.id } },
        ] : [
          { requestedAt: { lt: cursor.at } },
          { requestedAt: cursor.at, id: { lt: cursor.id } },
        ] }] } : {}),
        ...(input.lane === "review"
          ? { status: { in: ["submitted", "under_review"] } }
          : {}),
        tenantId: input.tenantId,
      },
    })
    const page = requests.slice(0, 50)
    const last = page.at(-1)
    if (requests.length > 50 && last) nextCursor = writeOperationsCursor(scope, last.id, last.requestedAt)
    items = page.map((request) =>
      mapRequest(request, {
        activeFinancingMemberIds,
        capabilities: input.capabilities,
        normalRemainingAmount: health.normal.remainingAmount,
        quickRemainingAmount: health.quick.remainingAmount,
        requiresDualApproval: Boolean(policy?.requiresDualLoanApproval),
      })
    )
    if (input.lane === "activity") {
      items = items.map((item) => ({ ...item, actions: [] }))
    }
  }

  return {
    capabilities: input.capabilities,
    currencyCode: tenant?.currencyCode ?? "NGN",
    cycle: {
      collectionCoverage: health.collectionCoverage,
      deployableFunds: health.deployableFunds,
      id: health.cycle?.id ?? null,
      intakeStatus: health.intakeStatus,
      normal: health.normal,
      normalAllocationPercentage: health.normalAllocationPercentage,
      periodEnd: health.periodEnd.toISOString(),
      periodStart: health.periodStart.toISOString(),
      projectedCommitmentAmount: health.projectedCommitmentAmount,
      quick: health.quick,
      quickAllocationPercentage: health.quickAllocationPercentage,
      receivedContributionAmount: health.receivedContributionAmount,
      reserveBufferAmount: health.reserveBufferAmount,
      status: health.cycle?.status ?? null,
      totalCapacityAmount: health.totalCapacityAmount,
      warnings: health.warnings,
    },
    generatedAt: new Date().toISOString(),
    items,
    lane: input.lane,
    nextCursor,
    stats: {
      blocked: items.filter((item) => item.blockers.length > 0).length,
      count: items.length,
      totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
    },
  }
}

export function updateMobileAdminFinancingCycle(input: {
  actorUserId: string
  commandId: string
  expectedState: "closed" | "draft" | "missing" | "open" | "paused"
  financingCycleId?: string | null
  status: "closed" | "open" | "paused"
  statusNote?: string | null
  tenantId: string
}) {
  const entityId = input.financingCycleId ?? "current-month-financing-cycle"
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: commandFingerprint({
      expectedState: input.expectedState,
      financingCycleId: input.financingCycleId ?? null,
      status: input.status,
      statusNote: input.statusNote ?? null,
    }),
    commandId: input.commandId,
    commandType: `financing_cycle.${input.status}`,
    entityId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      if (input.expectedState === "missing") {
        if (input.status !== "open") {
          throw ExpectedQueryError.validation(
            "A missing financing cycle can only be opened."
          )
        }
        const cycle = await openMonthlyFinancingCycle(
          {
            actorUserId: input.actorUserId,
            statusNote: input.statusNote ?? undefined,
            tenantId: input.tenantId,
          },
          prisma
        )
        return { id: cycle.id, state: cycle.status }
      }
      if (!input.financingCycleId) {
        throw ExpectedQueryError.validation(
          "Financing cycle identity is required. Refresh before continuing."
        )
      }
      const cycle = await updateMonthlyFinancingCycleStatus(
        {
          actorUserId: input.actorUserId,
          expectedStatus: input.expectedState as FinancingCycleStatus,
          financingCycleId: input.financingCycleId,
          status: input.status,
          statusNote: input.statusNote ?? undefined,
          tenantId: input.tenantId,
        },
        prisma
      )
      return { id: cycle.id, state: cycle.status }
    },
  })
}

export function disburseMobileAdminFinancing(input: {
  actorUserId: string
  commandId: string
  expectedState: string
  firstRepaymentDueAt?: string | null
  loanId: string
  tenantId: string
}) {
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: commandFingerprint({
      expectedState: input.expectedState,
      firstRepaymentDueAt: input.firstRepaymentDueAt ?? null,
      loanId: input.loanId,
    }),
    commandId: input.commandId,
    commandType: "financing.disburse",
    entityId: input.loanId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const loan = await disburseLoan(
        {
          actorUserId: input.actorUserId,
          expectedStatus: input.expectedState,
          firstRepaymentDueAt: input.firstRepaymentDueAt ?? undefined,
          loanId: input.loanId,
          tenantId: input.tenantId,
        },
        prisma
      )
      return { id: loan.id, state: loan.status }
    },
  })
}
