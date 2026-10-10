import type {
  PaymentAllocationPreference,
  PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import {
  closeContributionPlan,
  listContributions,
  recordMemberPayment,
  setMemberContributionPlan,
  updateMemberPaymentAllocationPreference,
  type RecordMemberPaymentInput,
} from "./contributions"
import {
  getCollectionSourceContributionBatch,
  listCollectionSourceContributionBatches,
  postCollectionSourceContributionBatchRows,
  stageCollectionSourceContributionBatch,
  updateCollectionSourceContributionBatchRows,
  type CollectionSourceBatchRowUpdateInput,
} from "./collection-source-batches"
import { runMobileAdminCommand } from "./mobile-admin-finance-support"

export const mobileAdminContributionLanes = [
  "ledger",
  "commitments",
  "collections",
] as const

export type MobileAdminContributionLane =
  (typeof mobileAdminContributionLanes)[number]

export type MobileAdminContributionCapabilities = {
  manageBatches: boolean
  manageMemberContributions: boolean
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
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [
          key,
          Array.isArray(item) ? [...item].sort() : item,
        ])
    )
  )
}

function assertExpectedState(actual: string, expected: string) {
  if (actual !== expected) {
    throw ExpectedQueryError.conflict(
      "This record changed since it was loaded. Refresh before continuing."
    )
  }
}

async function tenantCurrency(tenantId: string, prisma: PrismaClient) {
  const tenant = await prisma.tenant.findUnique({
    select: { currencyCode: true },
    where: { id: tenantId },
  })
  return tenant?.currencyCode ?? "NGN"
}

async function contributionStats(tenantId: string, prisma: PrismaClient) {
  const periodStart = new Date()
  periodStart.setUTCDate(1)
  periodStart.setUTCHours(0, 0, 0, 0)
  const [posted, members, exceptions] = await Promise.all([
    prisma.contribution.aggregate({
      _sum: { amount: true },
      where: { postedAt: { gte: periodStart }, status: "posted", tenantId },
    }),
    prisma.member.count({
      where: { status: { not: "exited" }, tenantId },
    }),
    (prisma as any).collectionSourceContributionBatchRow.count({
      where: { status: { in: ["blocked", "exception"] }, tenantId },
    }),
  ])
  return {
    exceptions: Number(exceptions),
    members,
    postedThisMonth: Number(posted._sum.amount ?? 0),
  }
}

export async function getMobileAdminContributionWorkspace(
  input: {
    capabilities: MobileAdminContributionCapabilities
    cursor?: string | null
    lane: MobileAdminContributionLane
    search?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const [currencyCode, stats] = await Promise.all([
    tenantCurrency(input.tenantId, prisma),
    contributionStats(input.tenantId, prisma),
  ])
  const shared = {
    capabilities: input.capabilities,
    currencyCode,
    generatedAt: new Date(),
    lane: input.lane,
    stats,
  }

  if (input.lane === "ledger") {
    const page = await listContributions(
      input.tenantId,
      {
        cursor: input.cursor,
        pageSize: 30,
        search: input.search,
        sort: ["postedAt", "desc"],
      },
      prisma
    )
    return {
      ...shared,
      data: page.items.map((item) => ({
        amount: Number(item.amount),
        channel: item.channel,
        committedAmount: Number(item.committedAmount ?? 0),
        extraSavingsAmount: Number(item.extraSavingsAmount ?? 0),
        id: item.id,
        memberId: item.member.id,
        memberName: item.member.fullName,
        memberNumber: item.member.memberNumber,
        periodLabel: item.periodLabel,
        postedAt: item.postedAt,
        reference: item.reference,
        status: item.status,
      })),
      nextCursor: page.nextCursor,
    }
  }

  if (input.lane === "commitments") {
    const members = await prisma.member.findMany({
      include: {
        contributionPlans: {
          orderBy: { startsAt: "desc" },
          take: 1,
          where: { isActive: true },
        },
        deductionSource: { select: { name: true } },
      },
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      take: 40,
      where: {
        status: { not: "exited" },
        tenantId: input.tenantId,
        ...(input.search
          ? {
              OR: [
                { fullName: { contains: input.search, mode: "insensitive" } },
                {
                  memberNumber: {
                    contains: input.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
    })
    return {
      ...shared,
      data: members.map((member) => ({
        activeCommitmentAmount: Number(
          member.contributionPlans[0]?.amount ?? 0
        ),
        activePlanId: member.contributionPlans[0]?.id ?? null,
        deductionSourceName: member.deductionSource?.name ?? null,
        id: member.id,
        name: member.fullName,
        number: member.memberNumber,
        paymentAllocationPreference: member.paymentAllocationPreference,
        status: member.status,
        totalSavings: Number(member.totalSavingsSnapshot),
      })),
      nextCursor: null,
    }
  }

  const [batches, sources] = await Promise.all([
    listCollectionSourceContributionBatches(input.tenantId, prisma),
    (prisma as any).deductionSource.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
      where: {
        isActive: true,
        tenantId: input.tenantId,
        ...(input.search
          ? { name: { contains: input.search, mode: "insensitive" } }
          : {}),
      },
    }),
  ])
  return {
    ...shared,
    data: batches.filter((batch) =>
      input.search
        ? `${batch.deductionSource.name} ${batch.periodLabel} ${batch.reference ?? ""}`
            .toLowerCase()
            .includes(input.search.toLowerCase())
        : true
    ),
    nextCursor: null,
    sources,
  }
}

export async function getMobileAdminContributionMemberWorkspace(
  input: { memberId: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const member = await prisma.member.findFirst({
    include: {
      contributionPlans: { orderBy: { startsAt: "desc" } },
      contributions: { orderBy: { postedAt: "desc" }, take: 12 },
      deductionSource: { select: { name: true } },
      loans: {
        orderBy: { createdAt: "desc" },
        take: 1,
        where: { status: { in: ["approved", "disbursed", "active"] } },
      },
    },
    where: { id: input.memberId, tenantId: input.tenantId },
  })
  if (!member) throw ExpectedQueryError.notFound("Member not found.")
  const activePlan = member.contributionPlans.find((plan) => plan.isActive)
  const activeLoan = member.loans[0] ?? null
  return {
    activeLoan: activeLoan
      ? {
          estimatedMonthlyServicing: Number(
            activeLoan.estimatedMonthlyServicing
          ),
          id: activeLoan.id,
          outstandingPrincipal: Number(activeLoan.outstandingPrincipal),
        }
      : null,
    activePlanId: activePlan?.id ?? null,
    commitmentTarget: Number(activePlan?.amount ?? 0),
    contributionHistory: member.contributions.map((item) => ({
      amount: Number(item.amount),
      id: item.id,
      postedAt: item.postedAt,
      status: item.status,
    })),
    deductionSourceName: member.deductionSource?.name ?? null,
    id: member.id,
    name: member.fullName,
    number: member.memberNumber,
    paymentAllocationPreference: member.paymentAllocationPreference,
    planHistory: member.contributionPlans.map((plan) => ({
      amount: Number(plan.amount),
      endsAt: plan.endsAt,
      id: plan.id,
      isActive: plan.isActive,
      name: plan.name,
      startsAt: plan.startsAt,
    })),
    status: member.status,
    totalSavings: Number(member.totalSavingsSnapshot),
    workspaceState: `${activePlan?.id ?? "none"}:${activeLoan?.id ?? "none"}`,
  }
}

export async function getMobileAdminContributionBatch(
  input: { batchId: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const batch = await getCollectionSourceContributionBatch(
    input.tenantId,
    input.batchId,
    getPrisma(prismaOverride)
  )
  if (!batch)
    throw ExpectedQueryError.notFound("Collection Source batch not found.")
  return batch
}

type CommandBase = {
  actorUserId: string
  commandId: string
  expectedState: string
  tenantId: string
}

export function setMobileMemberContributionPlan(
  input: CommandBase & {
    amount: number
    memberId: string
    name?: string
    startsAt: Date
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandFingerprint: fingerprint({
      amount: input.amount,
      memberId: input.memberId,
      name: input.name ?? null,
      startsAt: input.startsAt.toISOString(),
    }),
    commandType: "contribution_plan.set",
    entityId: input.memberId,
    execute: async (prisma) => {
      const active = await prisma.contributionPlan.findFirst({
        select: { id: true },
        where: {
          isActive: true,
          memberId: input.memberId,
          tenantId: input.tenantId,
        },
      })
      assertExpectedState(active?.id ?? "none", input.expectedState)
      const plan = await setMemberContributionPlan(input, prisma)
      return { id: plan.id, state: "active" }
    },
  })
}

export function closeMobileMemberContributionPlan(
  input: CommandBase & { endsAt: Date; planId: string }
) {
  return runMobileAdminCommand({
    ...input,
    commandFingerprint: fingerprint({
      endsAt: input.endsAt.toISOString(),
      planId: input.planId,
    }),
    commandType: "contribution_plan.close",
    entityId: input.planId,
    execute: async (prisma) => {
      const plan = await prisma.contributionPlan.findFirst({
        select: { isActive: true },
        where: { id: input.planId, tenantId: input.tenantId },
      })
      if (!plan)
        throw ExpectedQueryError.notFound("Contribution plan not found.")
      assertExpectedState(
        plan.isActive ? "active" : "closed",
        input.expectedState
      )
      const closed = await closeContributionPlan(input, prisma)
      return { id: closed.id, state: "closed" }
    },
  })
}

export function updateMobileMemberAllocationPreference(
  input: CommandBase & {
    memberId: string
    preference: PaymentAllocationPreference
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandFingerprint: fingerprint({
      memberId: input.memberId,
      preference: input.preference,
    }),
    commandType: "member.allocation_preference.update",
    entityId: input.memberId,
    execute: async (prisma) => {
      const member = await prisma.member.findFirst({
        select: { paymentAllocationPreference: true },
        where: { id: input.memberId, tenantId: input.tenantId },
      })
      if (!member) throw ExpectedQueryError.notFound("Member not found.")
      assertExpectedState(
        member.paymentAllocationPreference,
        input.expectedState
      )
      const result = await updateMemberPaymentAllocationPreference(
        input,
        prisma
      )
      return { id: result.id, state: result.paymentAllocationPreference }
    },
  })
}

export function recordMobileMemberContributionPayment(
  input: CommandBase &
    Omit<RecordMemberPaymentInput, "actorUserId" | "tenantId">
) {
  return runMobileAdminCommand({
    ...input,
    commandFingerprint: fingerprint({
      channel: input.channel,
      committedSavingsAmount: input.committedSavingsAmount,
      contributionPlanId: input.contributionPlanId ?? null,
      extraLoanPaymentAmount: input.extraLoanPaymentAmount ?? 0,
      extraSavingsAmount: input.extraSavingsAmount ?? 0,
      loanId: input.loanId ?? null,
      memberId: input.memberId,
      periodLabel: input.periodLabel ?? null,
      postedAt: input.postedAt.toISOString(),
      reference: input.reference ?? null,
      scheduledLoanServicingAmount: input.scheduledLoanServicingAmount ?? 0,
      totalAmount: input.totalAmount ?? null,
    }),
    commandType: "member_payment.record",
    entityId: input.memberId,
    execute: async (prisma) => {
      const workspace = await getMobileAdminContributionMemberWorkspace(
        input,
        prisma
      )
      assertExpectedState(workspace.workspaceState, input.expectedState)
      const result = await recordMemberPayment(input, prisma)
      return {
        id: result.contributionId ?? result.repaymentId ?? input.memberId,
        state: "posted",
      }
    },
  })
}

export function stageMobileCollectionSourceBatch(
  input: CommandBase & {
    deductionSourceId: string
    month: number
    notes?: string | null
    reference?: string | null
    year: number
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandFingerprint: fingerprint({
      deductionSourceId: input.deductionSourceId,
      month: input.month,
      notes: input.notes ?? null,
      reference: input.reference ?? null,
      year: input.year,
    }),
    commandType: "collection_source_batch.stage",
    entityId: input.deductionSourceId,
    execute: async (prisma) => {
      const existing = await (
        prisma as any
      ).collectionSourceContributionBatch.findUnique({
        where: {
          tenantId_deductionSourceId_periodYear_periodMonth: {
            deductionSourceId: input.deductionSourceId,
            periodMonth: input.month,
            periodYear: input.year,
            tenantId: input.tenantId,
          },
        },
      })
      assertExpectedState(existing?.id ?? "absent", input.expectedState)
      const batch = await stageCollectionSourceContributionBatch(input, prisma)
      return { id: batch.id, state: batch.status }
    },
  })
}

export function updateMobileCollectionSourceBatchRows(
  input: CommandBase & {
    batchId: string
    rows: CollectionSourceBatchRowUpdateInput[]
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandFingerprint: fingerprint({
      batchId: input.batchId,
      rows: input.rows.map(
        (row) =>
          `${row.rowId}:${row.status}:${row.paidAmount ?? ""}:${row.exceptionReason ?? ""}`
      ),
    }),
    commandType: "collection_source_batch.rows.update",
    entityId: input.batchId,
    execute: async (prisma) => {
      const batch = await getMobileAdminContributionBatch(input, prisma)
      assertExpectedState(batch.status, input.expectedState)
      const updated = await updateCollectionSourceContributionBatchRows(
        input,
        prisma
      )
      return { id: updated.id, state: updated.status }
    },
  })
}

export function postMobileCollectionSourceBatchRows(
  input: CommandBase & {
    batchId: string
    notes?: string | null
    postedAt?: Date
    reference?: string | null
    rowIds: string[]
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandFingerprint: fingerprint({
      batchId: input.batchId,
      notes: input.notes ?? null,
      postedAt: input.postedAt?.toISOString() ?? null,
      reference: input.reference ?? null,
      rowIds: input.rowIds,
    }),
    commandType: "collection_source_batch.rows.post",
    entityId: input.batchId,
    execute: async (prisma) => {
      const batch = await getMobileAdminContributionBatch(input, prisma)
      assertExpectedState(batch.status, input.expectedState)
      const posted = await postCollectionSourceContributionBatchRows(
        input,
        prisma
      )
      return { id: posted.id, state: posted.status }
    },
  })
}
