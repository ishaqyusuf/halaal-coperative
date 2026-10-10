import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { createMemberPaymentReceipt } from "./payment-receipts"
import {
  getProcurementRequest,
  getProcurementSummary,
  listProcurementRequests,
  recordProcurementPurchase,
  reviewProcurementRequest,
  type ProcurementRequestRow,
} from "./procurement"
import { runMobileAdminCommand } from "./mobile-admin-finance-support"

export const mobileAdminProcurementLanes = [
  "review",
  "activate",
  "servicing",
  "completed",
] as const
export type MobileAdminProcurementLane =
  (typeof mobileAdminProcurementLanes)[number]

export type MobileAdminProcurementCapabilities = {
  activate: boolean
  review: boolean
  submitPayment: boolean
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

function parseDateOnly(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw ExpectedQueryError.validation(`${label} must use YYYY-MM-DD.`)
  }
  const parsed = new Date(`${value}T12:00:00.000Z`)
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw ExpectedQueryError.validation(`${label} is invalid.`)
  }
  return parsed
}

export function validateMobileAdminProcurementPurchaseDates(input: {
  firstDueDate: string
  purchaseDate: string
}) {
  const purchaseDate = parseDateOnly(input.purchaseDate, "Purchase date")
  const firstDueDate = parseDateOnly(input.firstDueDate, "First due date")

  if (firstDueDate.getTime() < purchaseDate.getTime()) {
    throw ExpectedQueryError.validation(
      "First due date cannot be before the purchase date."
    )
  }

  return { firstDueDate, purchaseDate }
}

export function getMobileAdminProcurementEffectiveScheduleState(input: {
  dueDate: Date
  status: string
}, asOf = new Date()) {
  if (["paid", "waived"].includes(input.status)) return input.status

  const dueDate = new Date(input.dueDate)
  dueDate.setUTCHours(0, 0, 0, 0)
  const today = new Date(asOf)
  today.setUTCHours(0, 0, 0, 0)

  if (dueDate.getTime() < today.getTime()) return "overdue"
  if (dueDate.getTime() === today.getTime()) return "due"
  return input.status
}

function requestLane(request: ProcurementRequestRow): MobileAdminProcurementLane {
  if (["submitted", "under_review"].includes(request.status)) return "review"
  if (request.status === "approved") return "activate"
  if (["active", "purchased"].includes(request.status)) return "servicing"
  return "completed"
}

function serializeRequest(request: ProcurementRequestRow) {
  const now = Date.now()
  const scheduleItems = request.repaymentScheduleItems.map((item) => ({
    ...item,
    dueDate: item.dueDate.toISOString(),
    outstandingAmount: Math.max(0, item.amount - item.paidAmount),
  }))
  const nextDue =
    scheduleItems.find(
      (item) => item.outstandingAmount > 0 && item.status !== "waived"
    ) ?? null
  const overdueCount = scheduleItems.filter(
    (item) =>
      item.outstandingAmount > 0 && new Date(item.dueDate).getTime() < now
  ).length

  return {
    ...request,
    createdAt: request.createdAt.toISOString(),
    lane: requestLane(request),
    nextDue,
    overdueCount,
    purchasedAt: request.purchasedAt?.toISOString() ?? null,
    repaymentScheduleItems: scheduleItems,
    requestedAt: request.requestedAt.toISOString(),
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
  }
}

export async function getMobileAdminProcurementWorkspace(
  input: {
    capabilities: MobileAdminProcurementCapabilities
    lane: MobileAdminProcurementLane
    search?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const [tenant, requests, summary] = await Promise.all([
    prisma.tenant.findUnique({
      select: { currencyCode: true },
      where: { id: input.tenantId },
    }),
    listProcurementRequests(
      { limit: 80, tenantId: input.tenantId },
      prisma as PrismaClient
    ),
    getProcurementSummary(input.tenantId, prisma as PrismaClient),
  ])
  const query = input.search?.trim().toLowerCase() ?? ""
  const items = requests
    .filter((request) => requestLane(request) === input.lane)
    .filter((request) => {
      if (!query) return true
      return [
        request.id,
        request.itemName,
        request.member.fullName,
        request.member.memberNumber,
        request.vendorName ?? "",
      ].some((value) => value.toLowerCase().includes(query))
    })
    .map(serializeRequest)
    .sort((left, right) => {
      if (input.lane === "servicing") {
        return right.overdueCount - left.overdueCount
      }
      return right.requestedAt.localeCompare(left.requestedAt)
    })

  return {
    capabilities: input.capabilities,
    currencyCode: tenant?.currencyCode ?? "NGN",
    generatedAt: new Date().toISOString(),
    items,
    lane: input.lane,
    summary,
  }
}

export async function getMobileAdminProcurementDetail(
  input: { procurementRequestId: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const request = await getProcurementRequest(input, prismaOverride)
  if (!request) throw ExpectedQueryError.notFound("Procurement request not found")
  return serializeRequest(request)
}

export function reviewMobileAdminProcurementOperation(input: {
  actorUserId: string
  approvedCost?: number | null
  approvedRepaymentMonths?: number | null
  commandId: string
  expectedState: string
  notes?: string | null
  procurementRequestId: string
  status: "approved" | "rejected" | "under_review"
  tenantId: string
}) {
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: `procurement.${input.status}`,
    entityId: input.procurementRequestId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const request = await reviewProcurementRequest(
        {
          ...input,
          expectedStatus: input.expectedState as never,
        },
        prisma
      )
      return { id: request.id, state: request.status }
    },
  })
}

export function activateMobileAdminProcurementPurchase(input: {
  actorUserId: string
  commandId: string
  expectedState: "approved"
  firstDueDate: string
  procurementRequestId: string
  purchaseDate: string
  purchaseNotes?: string | null
  purchaseReference: string
  tenantId: string
}) {
  const { firstDueDate, purchaseDate } =
    validateMobileAdminProcurementPurchaseDates(input)
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: "procurement.purchase.activate",
    entityId: input.procurementRequestId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const request = await recordProcurementPurchase(
        {
          ...input,
          firstDueDate,
          purchaseDate,
        },
        prisma
      )
      return { id: request.id, state: request.status }
    },
  })
}

export function submitMobileAdminProcurementPayment(input: {
  actorUserId: string
  amount: number
  commandId: string
  expectedState: "due" | "overdue" | "partially_paid" | "pending"
  memberId: string
  notes?: string | null
  paidAt: string
  paymentReference: string
  procurementRepaymentScheduleItemId: string
  tenantId: string
}) {
  const paidAt = parseDateOnly(input.paidAt, "Payment date")
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: "procurement.payment.submit",
    entityId: input.procurementRepaymentScheduleItemId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const scheduleItem =
        await prisma.procurementRepaymentScheduleItem.findFirst({
          select: {
            amount: true,
            dueDate: true,
            paidAmount: true,
            status: true,
          },
          where: {
            id: input.procurementRepaymentScheduleItemId,
            memberId: input.memberId,
            tenantId: input.tenantId,
          },
        })

      if (!scheduleItem) {
        throw ExpectedQueryError.notFound(
          "Procurement schedule item was not found."
        )
      }

      const currentState = getMobileAdminProcurementEffectiveScheduleState(
        scheduleItem
      )
      if (currentState !== input.expectedState) {
        throw ExpectedQueryError.conflict(
          "This installment changed after the screen was opened. Refresh and review the latest state."
        )
      }

      const remainingAmount =
        Number(scheduleItem.amount) - Number(scheduleItem.paidAmount)
      if (input.amount - remainingAmount > 0.005) {
        throw ExpectedQueryError.validation(
          "Payment amount exceeds the remaining installment balance."
        )
      }

      const receipt = await createMemberPaymentReceipt(
        {
          allocations: [
            {
              amount: input.amount,
              category: "procurement",
              notes: input.notes ?? undefined,
              periodIntent: "current_period",
              procurementRepaymentScheduleItemId:
                input.procurementRepaymentScheduleItemId,
            },
          ],
          channel: "manual",
          memberId: input.memberId,
          memberNotes: input.notes,
          paidAt,
          paymentReference: input.paymentReference.trim(),
          submittedByUserId: input.actorUserId,
          tenantId: input.tenantId,
          totalAmount: input.amount,
        },
        prisma
      )
      return { id: receipt.id, state: receipt.status }
    },
  })
}
