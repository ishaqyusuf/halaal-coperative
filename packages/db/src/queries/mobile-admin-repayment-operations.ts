import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { postRepayment, recordCollectionFollowUp } from "./loans"
import { runMobileAdminCommand } from "./mobile-admin-finance-support"
import { operationsCursorScope, readOperationsCursor, writeOperationsCursor } from "./mobile-operations-cursor"

export const mobileAdminRepaymentLanes = [
  "due",
  "collections",
  "posted",
] as const
export type MobileAdminRepaymentLane =
  (typeof mobileAdminRepaymentLanes)[number]

export type MobileAdminRepaymentCapabilities = {
  followUp: boolean
  post: boolean
  view: boolean
}

export type MobileAdminRepaymentWorkspaceItem = {
  agingDays: number
  amount: number
  dueAt: string
  id: string
  installmentNumber: number | null
  lane: MobileAdminRepaymentLane
  latestFollowUp: {
    nextActionAt: string | null
    priority: string
    status: string
  } | null
  loan: {
    id: string
    outstandingPrincipal: number
    productName: string
    status: string
  }
  member: { id: string; name: string; number: string }
  reference: string | null
  state: string
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

function agingDays(dueAt: Date, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - dueAt.getTime()) / 86_400_000))
}

function dateOnly(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw ExpectedQueryError.validation(`${label} must use YYYY-MM-DD.`)
  }
  const parsed = new Date(`${value}T12:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw ExpectedQueryError.validation(`${label} is invalid.`)
  }
  return parsed
}

function searchWhere(search?: string) {
  if (!search?.trim()) return {}
  const query = search.trim()
  return {
    OR: [
      {
        member: {
          is: { fullName: { contains: query, mode: "insensitive" as const } },
        },
      },
      {
        member: {
          is: {
            memberNumber: { contains: query, mode: "insensitive" as const },
          },
        },
      },
      {
        loanProduct: {
          is: { name: { contains: query, mode: "insensitive" as const } },
        },
      },
    ],
  }
}

const loanPreview = {
  member: { select: { fullName: true, id: true, memberNumber: true } },
  loanProduct: { select: { name: true } },
} as const

export async function getMobileAdminRepaymentWorkspace(
  input: {
    capabilities: MobileAdminRepaymentCapabilities
    cursor?: string | null
    lane: MobileAdminRepaymentLane
    search?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const scope = operationsCursorScope(input, "repayments")
  const cursor = readOperationsCursor(input.cursor, scope)
  const now = new Date()
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  )
  const monthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  )
  const loanSearch = searchWhere(input.search)
  const [tenant, loans, schedule, repayments] = await Promise.all([
    prisma.tenant.findUnique({
      select: { currencyCode: true },
      where: { id: input.tenantId },
    }),
    prisma.loan.findMany({
      include: loanPreview,
      where: {
        ...loanSearch,
        status: { in: ["disbursed", "active"] },
        tenantId: input.tenantId,
      },
    }),
    input.lane === "posted"
      ? Promise.resolve([])
      : prisma.repaymentScheduleItem.findMany({
          include: {
            collectionFollowUps: {
              orderBy: { createdAt: "desc" },
              select: { nextActionAt: true, priority: true, status: true },
              take: 1,
            },
            loan: { include: loanPreview },
          },
          orderBy: [{ dueAt: "asc" }, { id: "asc" }],
          take: 81,
          where: {
            ...(cursor ? { AND: [{ OR: [
              { dueAt: { gt: cursor.at } },
              { dueAt: cursor.at, id: { gt: cursor.id } },
            ] }] } : {}),
            loan: { is: loanSearch },
            status: { in: ["pending", "due", "overdue", "partially_paid"] },
            tenantId: input.tenantId,
            ...(input.lane === "collections" ? { dueAt: { lt: now } } : {}),
          },
        }),
    input.lane === "posted"
      ? prisma.repayment.findMany({
          include: { loan: { include: loanPreview } },
          orderBy: [{ paidAt: "desc" }, { id: "desc" }],
          take: 81,
          where: {
            ...(cursor ? { AND: [{ OR: [
              { paidAt: { lt: cursor.at } },
              { paidAt: cursor.at, id: { lt: cursor.id } },
            ] }] } : {}),
            loan: { is: loanSearch },
            status: "posted",
            tenantId: input.tenantId,
          },
        })
      : Promise.resolve([]),
  ])

  const items: MobileAdminRepaymentWorkspaceItem[] =
    input.lane === "posted"
      ? repayments.slice(0, 80).map((repayment) => ({
          agingDays: 0,
          amount: Number(repayment.amount),
          dueAt: repayment.paidAt.toISOString(),
          id: repayment.id,
          installmentNumber: null,
          lane: "posted",
          latestFollowUp: null,
          loan: {
            id: repayment.loan.id,
            outstandingPrincipal: Number(repayment.loan.outstandingPrincipal),
            productName: repayment.loan.loanProduct.name,
            status: repayment.loan.status,
          },
          member: {
            id: repayment.loan.member.id,
            name: repayment.loan.member.fullName,
            number: repayment.loan.member.memberNumber,
          },
          reference: repayment.reference,
          state: repayment.status,
        }))
      : schedule
          .slice(0, 80)
          .filter((item) => Number(item.amountPaid) < Number(item.totalDue))
          .map((item) => ({
            agingDays: agingDays(item.dueAt, now),
            amount: Math.max(
              0,
              Number(item.totalDue) - Number(item.amountPaid)
            ),
            dueAt: item.dueAt.toISOString(),
            id: item.id,
            installmentNumber: item.installmentNumber,
            lane: input.lane,
            latestFollowUp: item.collectionFollowUps[0]
              ? {
                  nextActionAt:
                    item.collectionFollowUps[0].nextActionAt?.toISOString() ??
                    null,
                  priority: item.collectionFollowUps[0].priority,
                  status: item.collectionFollowUps[0].status,
                }
              : null,
            loan: {
              id: item.loan.id,
              outstandingPrincipal: Number(item.loan.outstandingPrincipal),
              productName: item.loan.loanProduct.name,
              status: item.loan.status,
            },
            member: {
              id: item.loan.member.id,
              name: item.loan.member.fullName,
              number: item.loan.member.memberNumber,
            },
            reference: null,
            state: item.status,
          }))

  // Advance over the raw page even if settled schedule rows are filtered out.
  const lastRepayment = repayments[79]
  const lastSchedule = schedule[79]
  const nextCursor = input.lane === "posted"
    ? repayments.length > 80 && lastRepayment
      ? writeOperationsCursor(scope, lastRepayment.id, lastRepayment.paidAt) : null
    : schedule.length > 80 && lastSchedule
      ? writeOperationsCursor(scope, lastSchedule.id, lastSchedule.dueAt) : null

  const outstanding = loans.reduce(
    (sum, loan) => sum + Number(loan.outstandingPrincipal),
    0
  )
  const principal = loans.reduce(
    (sum, loan) => sum + Number(loan.principalAmount),
    0
  )
  const allDue = await prisma.repaymentScheduleItem.findMany({
    select: { amountPaid: true, dueAt: true, totalDue: true },
    where: {
      loan: { is: { ...loanSearch, status: { in: ["disbursed", "active"] } } },
      status: { in: ["pending", "due", "overdue", "partially_paid"] },
      tenantId: input.tenantId,
    },
  })
  const dueThisMonth = allDue
    .filter((item) => item.dueAt >= monthStart && item.dueAt < monthEnd)
    .reduce(
      (sum, item) =>
        sum + Math.max(0, Number(item.totalDue) - Number(item.amountPaid)),
      0
    )
  const overdue = allDue
    .filter((item) => item.dueAt < now)
    .reduce(
      (sum, item) =>
        sum + Math.max(0, Number(item.totalDue) - Number(item.amountPaid)),
      0
    )

  return {
    capabilities: input.capabilities,
    currencyCode: tenant?.currencyCode ?? "NGN",
    generatedAt: new Date().toISOString(),
    items,
    lane: input.lane,
    nextCursor,
    summary: {
      activeFacilities: loans.length,
      dueThisMonth,
      outstanding,
      overdue,
      paidPrincipal: Math.max(0, principal - outstanding),
      principal,
    },
  }
}

export async function getMobileAdminRepaymentFacility(
  input: { loanId: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const loan = await prisma.loan.findFirst({
    include: {
      collectionFollowUps: {
        include: {
          actorUser: { select: { fullName: true } },
          assignedToUser: { select: { fullName: true } },
          repaymentScheduleItem: { select: { installmentNumber: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      member: { select: { fullName: true, id: true, memberNumber: true } },
      loanProduct: { select: { name: true } },
      repaymentScheduleItems: { orderBy: { installmentNumber: "asc" } },
      repayments: {
        include: { receivedByUser: { select: { fullName: true } } },
        orderBy: { paidAt: "desc" },
      },
    },
    where: { id: input.loanId, tenantId: input.tenantId },
  })
  if (!loan) throw ExpectedQueryError.notFound("Financing facility not found")
  const now = new Date()
  const schedule = loan.repaymentScheduleItems.map((item) => ({
    agingDays: agingDays(item.dueAt, now),
    amountPaid: Number(item.amountPaid),
    dueAt: item.dueAt.toISOString(),
    id: item.id,
    installmentNumber: item.installmentNumber,
    outstandingAmount: Math.max(
      0,
      Number(item.totalDue) - Number(item.amountPaid)
    ),
    state: item.status,
    totalDue: Number(item.totalDue),
  }))
  const nextDue =
    schedule.find(
      (item) => item.outstandingAmount > 0 && item.state !== "waived"
    ) ?? null
  return {
    collectionFollowUps: loan.collectionFollowUps.map((followUp) => ({
      actorName: followUp.actorUser.fullName,
      assignedToName: followUp.assignedToUser?.fullName ?? null,
      caseStage: followUp.caseStage,
      createdAt: followUp.createdAt.toISOString(),
      id: followUp.id,
      installmentNumber: followUp.repaymentScheduleItem.installmentNumber,
      nextActionAt: followUp.nextActionAt?.toISOString() ?? null,
      note: followUp.note,
      priority: followUp.priority,
      promiseToPayAt: followUp.promiseToPayAt?.toISOString() ?? null,
      resolutionStatus: followUp.resolutionStatus,
      status: followUp.status,
    })),
    id: loan.id,
    member: {
      id: loan.member.id,
      name: loan.member.fullName,
      number: loan.member.memberNumber,
    },
    nextDue,
    outstandingPrincipal: Number(loan.outstandingPrincipal),
    paidPrincipal: Math.max(
      0,
      Number(loan.principalAmount) - Number(loan.outstandingPrincipal)
    ),
    principalAmount: Number(loan.principalAmount),
    productName: loan.loanProduct.name,
    repayments: loan.repayments.map((repayment) => ({
      amount: Number(repayment.amount),
      id: repayment.id,
      paidAt: repayment.paidAt.toISOString(),
      receivedByName: repayment.receivedByUser.fullName,
      reference: repayment.reference,
      status: repayment.status,
    })),
    schedule,
    state: loan.status,
    termMonths: loan.termMonths,
    updatedAt: loan.updatedAt.toISOString(),
  }
}

export function postMobileAdminRepayment(input: {
  actorUserId: string
  amount: number
  commandId: string
  expectedOutstandingPrincipal: number
  expectedState: string
  loanId: string
  paidAt: string
  reference: string
  tenantId: string
}) {
  const paidAt = dateOnly(input.paidAt, "Repayment date")
  const tomorrow = new Date()
  tomorrow.setUTCHours(23, 59, 59, 999)
  if (paidAt > tomorrow) {
    throw ExpectedQueryError.validation(
      "Repayment date cannot be in the future."
    )
  }
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint({
      amount: input.amount,
      expectedOutstandingPrincipal: input.expectedOutstandingPrincipal,
      expectedState: input.expectedState,
      loanId: input.loanId,
      paidAt: input.paidAt,
      reference: input.reference,
    }),
    commandId: input.commandId,
    commandType: "repayment.post",
    entityId: input.loanId,
    expectedState: `${input.expectedState}:${input.expectedOutstandingPrincipal.toFixed(2)}`,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const repayment = await postRepayment(
        {
          actorUserId: input.actorUserId,
          amount: input.amount,
          expectedOutstandingPrincipal: input.expectedOutstandingPrincipal,
          expectedStatus: input.expectedState,
          loanId: input.loanId,
          paidAt,
          reference: input.reference.trim(),
          tenantId: input.tenantId,
        },
        prisma
      )
      return { id: repayment.id, state: repayment.status }
    },
  })
}

export function recordMobileAdminCollectionFollowUp(input: {
  actorUserId: string
  caseStage: "active" | "escalated" | "promise_tracking" | "resolved"
  commandId: string
  expectedState: "due" | "overdue" | "partially_paid" | "pending"
  nextActionAt?: string | null
  note: string
  priority: "high" | "low" | "normal"
  promiseToPayAt?: string | null
  repaymentScheduleItemId: string
  status: "promise_to_pay" | "reminded" | "settled" | "unreachable"
  tenantId: string
}) {
  if (input.nextActionAt) dateOnly(input.nextActionAt, "Next action date")
  if (input.promiseToPayAt) dateOnly(input.promiseToPayAt, "Promise date")
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint({
      caseStage: input.caseStage,
      expectedState: input.expectedState,
      nextActionAt: input.nextActionAt ?? null,
      note: input.note,
      priority: input.priority,
      promiseToPayAt: input.promiseToPayAt ?? null,
      repaymentScheduleItemId: input.repaymentScheduleItemId,
      status: input.status,
    }),
    commandId: input.commandId,
    commandType: "collections.follow_up",
    entityId: input.repaymentScheduleItemId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const followUp = await recordCollectionFollowUp(
        {
          actorUserId: input.actorUserId,
          caseStage: input.caseStage,
          expectedScheduleStatus: input.expectedState,
          nextActionAt: input.nextActionAt ?? undefined,
          note: input.note.trim(),
          priority: input.priority,
          promiseToPayAt: input.promiseToPayAt ?? undefined,
          repaymentScheduleItemId: input.repaymentScheduleItemId,
          status: input.status,
          tenantId: input.tenantId,
        },
        prisma
      )
      return { id: followUp.id, state: followUp.status }
    },
  })
}
