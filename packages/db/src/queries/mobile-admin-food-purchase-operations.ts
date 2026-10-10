import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import {
  createFoodPurchaseCycle,
  findFoodPurchaseApplication,
  listFoodPurchaseApplicationPage,
  listFoodPurchaseCycles,
  recordFoodPurchaseAccounting,
  reviewFoodPurchaseAccounting,
  reviewFoodPurchaseApplication,
  transitionFoodPurchaseCycle,
  type FoodPurchaseApplicationRow,
  type FoodPurchaseCycleStatus,
  type FoodPurchaseCycleTransition,
} from "./food-purchase"
import { runMobileAdminCommand } from "./mobile-admin-finance-support"

export const mobileAdminFoodPurchaseLanes = [
  "applications",
  "accounting",
  "history",
] as const
export type MobileAdminFoodPurchaseLane =
  (typeof mobileAdminFoodPurchaseLanes)[number]

export type MobileAdminFoodPurchaseCapabilities = {
  releaseFunds: boolean
  reviewAccounting: boolean
  reviewApplications: boolean
  submitAccounting: boolean
  view: boolean
}

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

function serializeApplication(application: FoodPurchaseApplicationRow) {
  const approvedAmount = application.approvedAmount ?? 0
  return {
    ...application,
    createdAt: application.createdAt.toISOString(),
    cycle: {
      ...application.cycle,
      periodMonth: application.cycle.periodMonth.toISOString(),
    },
    outstandingAmount: Math.max(0, approvedAmount - application.paidAmount),
    paidAt: application.paidAt?.toISOString() ?? null,
    requestedAt: application.requestedAt.toISOString(),
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
    updatedAt: application.updatedAt.toISOString(),
  }
}

function serializeCycle(
  cycle: Awaited<ReturnType<typeof listFoodPurchaseCycles>>[number]
) {
  return {
    ...cycle,
    accountingSubmittedAt: cycle.accountingSubmittedAt?.toISOString() ?? null,
    createdAt: cycle.createdAt.toISOString(),
    periodMonth: cycle.periodMonth.toISOString(),
    releasedAt: cycle.releasedAt.toISOString(),
    updatedAt: cycle.updatedAt.toISOString(),
  }
}

function isHistoryStatus(status: FoodPurchaseCycleStatus) {
  return ["accounting_approved", "cancelled", "closed", "completed"].includes(
    status
  )
}

export async function getMobileAdminFoodPurchaseWorkspace(
  input: {
    capabilities: MobileAdminFoodPurchaseCapabilities
    cursor?: string
    cycleId?: string
    lane: MobileAdminFoodPurchaseLane
    search?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const [tenant, cycles] = await Promise.all([
    prisma.tenant.findUnique({
      select: { currencyCode: true },
      where: { id: input.tenantId },
    }),
    listFoodPurchaseCycles(
      { limit: 36, tenantId: input.tenantId },
      prisma as PrismaClient
    ),
  ])
  const activeCycles = cycles.filter((cycle) => !isHistoryStatus(cycle.status))
  const selectedCycle =
    cycles.find((cycle) => cycle.id === input.cycleId) ??
    activeCycles[0] ??
    cycles[0] ??
    null
  const applicationWhere = selectedCycle
    ? { cycleId: selectedCycle.id, tenantId: input.tenantId }
    : { cycleId: "__missing_cycle__", tenantId: input.tenantId }
  const [
    applicationPage,
    applicationTotals,
    pendingApplications,
    totalApplications,
  ] = await Promise.all([
    selectedCycle && input.lane === "applications"
      ? listFoodPurchaseApplicationPage(
          {
            cursor: input.cursor,
            cycleId: selectedCycle.id,
            pageSize: 30,
            search: input.search,
            tenantId: input.tenantId,
          },
          prisma as PrismaClient
        )
      : Promise.resolve({
          data: [] as FoodPurchaseApplicationRow[],
          meta: { cursor: undefined, total: 0 },
        }),
    selectedCycle
      ? prisma.foodPurchaseApplication.aggregate({
          _sum: {
            approvedAmount: true,
            paidAmount: true,
            requestedAmount: true,
          },
          where: applicationWhere,
        })
      : Promise.resolve({
          _sum: { approvedAmount: 0, paidAmount: 0, requestedAmount: 0 },
        }),
    selectedCycle
      ? prisma.foodPurchaseApplication.count({
          where: {
            ...applicationWhere,
            status: { in: ["submitted", "under_review"] },
          },
        })
      : Promise.resolve(0),
    selectedCycle
      ? prisma.foodPurchaseApplication.count({ where: applicationWhere })
      : Promise.resolve(0),
  ])
  const approvedAmount = Number(applicationTotals._sum.approvedAmount ?? 0)
  const paidAmount = Number(applicationTotals._sum.paidAmount ?? 0)
  const requestedAmount = Number(applicationTotals._sum.requestedAmount ?? 0)
  const releasedAmount = selectedCycle?.releasedAmount ?? 0

  return {
    applications: applicationPage.data.map(serializeApplication),
    capabilities: input.capabilities,
    currencyCode: tenant?.currencyCode ?? "NGN",
    cycles: cycles.map(serializeCycle),
    generatedAt: new Date().toISOString(),
    lane: input.lane,
    nextApplicationCursor: applicationPage.meta.cursor ?? null,
    selectedCycle: selectedCycle ? serializeCycle(selectedCycle) : null,
    summary: {
      approvedAmount,
      allocationShortfallAmount: Math.max(0, approvedAmount - releasedAmount),
      availableAmount: Math.max(0, releasedAmount - approvedAmount),
      outstandingAmount: Math.max(0, approvedAmount - paidAmount),
      paidAmount,
      pendingApplications,
      requestedAmount,
      totalApplications,
    },
  }
}

export async function getMobileAdminFoodPurchaseApplicationDetail(
  input: { applicationId: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const application = await findFoodPurchaseApplication(input, prismaOverride)
  if (!application) {
    throw ExpectedQueryError.notFound(
      "Foodstuff Purchase application not found."
    )
  }
  return serializeApplication(application)
}

export function createMobileAdminFoodPurchaseCycle(input: {
  actorUserId: string
  commandId: string
  periodMonth: string
  releasedAmount: number
  releasedAt: string
  releaseNotes?: string | null
  tenantId: string
}) {
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: "food_purchase.cycle.release",
    entityId: input.periodMonth,
    expectedState: "missing",
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const cycle = await createFoodPurchaseCycle(
        {
          ...input,
          initialStatus: "draft",
          periodMonth: new Date(`${input.periodMonth}T12:00:00.000Z`),
          releasedAt: new Date(`${input.releasedAt}T12:00:00.000Z`),
          requestSource: "staff",
        },
        prisma
      )
      return { id: cycle.id, state: cycle.status }
    },
  })
}

export function transitionMobileAdminFoodPurchaseCycle(input: {
  actorUserId: string
  commandId: string
  cycleId: string
  expectedState: FoodPurchaseCycleStatus
  notes?: string | null
  tenantId: string
  transition: FoodPurchaseCycleTransition
}) {
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: `food_purchase.cycle.${input.transition}`,
    entityId: input.cycleId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const cycle = await transitionFoodPurchaseCycle(
        {
          ...input,
          expectedStatus: input.expectedState,
        },
        prisma
      )
      return { id: cycle.id, state: cycle.status }
    },
  })
}

export function reviewMobileAdminFoodPurchaseApplicationOperation(input: {
  actorUserId: string
  applicationId: string
  approvedAmount?: number | null
  approvedPaybackMonths?: number | null
  commandId: string
  expectedState: "submitted" | "under_review"
  notes?: string | null
  status: "approved" | "rejected" | "under_review"
  tenantId: string
}) {
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: `food_purchase.application.${input.status}`,
    entityId: input.applicationId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const application = await reviewFoodPurchaseApplication(
        {
          ...input,
          expectedStatus: input.expectedState,
        },
        prisma
      )
      return { id: application.id, state: application.status }
    },
  })
}

export function submitMobileAdminFoodPurchaseAccounting(input: {
  actorUserId: string
  commandId: string
  cycleId: string
  expectedState: "accounting_rejected" | "intake_closed"
  notes?: string | null
  operatingExpenseAmount: number
  purchaseCostAmount: number
  salesAmount: number
  tenantId: string
}) {
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: "food_purchase.accounting.submit",
    entityId: input.cycleId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const cycle = await recordFoodPurchaseAccounting(input, prisma)
      return { id: cycle.id, state: cycle.status }
    },
  })
}

export function reviewMobileAdminFoodPurchaseAccounting(input: {
  actorUserId: string
  commandId: string
  cycleId: string
  decision: "approved" | "rejected"
  expectedState: "accounting_submitted"
  notes?: string | null
  tenantId: string
}) {
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: `food_purchase.accounting.${input.decision}`,
    entityId: input.cycleId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const cycle = await reviewFoodPurchaseAccounting(input, prisma)
      return { id: cycle.id, state: cycle.status }
    },
  })
}
