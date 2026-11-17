import type {
  PaymentAllocationPreference,
  PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import {
  closeContributionPlan,
  recordMemberPayment,
  setMemberContributionPlan,
  updateMemberPaymentAllocationPreference,
  type RecordMemberPaymentInput,
} from "./contributions"
import {
  getCollectionSourceContributionBatch,
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

async function activeDeductionSources(tenantId: string, prisma: PrismaClient) {
  return (prisma as any).deductionSource.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true },
    where: { isActive: true, tenantId },
  }) as Promise<{ id: string; name: string; type: string }[]>
}

/**
 * The lane-independent header: stats, currency, capabilities and the
 * collection sources the stage-batch form needs. Mobile reads it once per
 * screen visit (and after writes) instead of with every lane page.
 */
export async function getMobileAdminContributionSummary(
  input: {
    capabilities: MobileAdminContributionCapabilities
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const [currencyCode, stats, sources] = await Promise.all([
    tenantCurrency(input.tenantId, prisma),
    contributionStats(input.tenantId, prisma),
    activeDeductionSources(input.tenantId, prisma),
  ])
  return {
    capabilities: input.capabilities,
    currencyCode,
    generatedAt: new Date(),
    sources,
    stats,
  }
}

export const mobileAdminContributionPageSize = 30
const collectionBatchPageSize = 20

function pageOf<T extends { id: string }>(rows: T[], take: number) {
  const hasNext = rows.length > take
  const items = hasNext ? rows.slice(0, take) : rows
  return { items, nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null }
}

function cursorArgs(cursor: string | null | undefined) {
  return cursor ? { cursor: { id: cursor }, skip: 1 } : {}
}

async function ledgerPage(
  input: { cursor?: string | null; search?: string; tenantId: string },
  prisma: PrismaClient
) {
  const take = mobileAdminContributionPageSize
  const search = input.search
  const rows = await prisma.contribution.findMany({
    ...cursorArgs(input.cursor),
    orderBy: [{ postedAt: "desc" }, { id: "desc" }],
    select: {
      amount: true,
      channel: true,
      committedAmount: true,
      extraSavingsAmount: true,
      id: true,
      member: { select: { fullName: true, id: true, memberNumber: true } },
      periodLabel: true,
      postedAt: true,
      reference: true,
      status: true,
    },
    take: take + 1,
    where: {
      tenantId: input.tenantId,
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: "insensitive" } },
              {
                member: {
                  OR: [
                    { fullName: { contains: search, mode: "insensitive" } },
                    {
                      memberNumber: { contains: search, mode: "insensitive" },
                    },
                  ],
                },
              },
            ],
          }
        : {}),
    },
  })
  const page = pageOf(rows, take)
  return {
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

async function commitmentsPage(
  input: { cursor?: string | null; search?: string; tenantId: string },
  prisma: PrismaClient
) {
  const take = mobileAdminContributionPageSize
  const members = await prisma.member.findMany({
    ...cursorArgs(input.cursor),
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    select: {
      contributionPlans: {
        orderBy: { startsAt: "desc" },
        select: { amount: true, id: true },
        take: 1,
        where: { isActive: true },
      },
      deductionSource: { select: { name: true } },
      fullName: true,
      id: true,
      memberNumber: true,
      paymentAllocationPreference: true,
      status: true,
      totalSavingsSnapshot: true,
    },
    take: take + 1,
    where: {
      status: { not: "exited" },
      tenantId: input.tenantId,
      ...(input.search
        ? {
            OR: [
              { fullName: { contains: input.search, mode: "insensitive" } },
              { memberNumber: { contains: input.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  })
  const page = pageOf(members, take)
  return {
    data: page.items.map((member) => ({
      activeCommitmentAmount: Number(member.contributionPlans[0]?.amount ?? 0),
      activePlanId: member.contributionPlans[0]?.id ?? null,
      deductionSourceName: member.deductionSource?.name ?? null,
      id: member.id,
      name: member.fullName,
      number: member.memberNumber,
      paymentAllocationPreference: member.paymentAllocationPreference,
      status: member.status,
      totalSavings: Number(member.totalSavingsSnapshot),
    })),
    nextCursor: page.nextCursor,
  }
}

/**
 * Batch summaries without loading their rows: one page of batches plus one
 * grouped aggregate of row counts and amounts for that page.
 */
async function collectionsPage(
  input: { cursor?: string | null; search?: string; tenantId: string },
  prisma: PrismaClient
) {
  const take = collectionBatchPageSize
  const search = input.search
  const batches = await (
    prisma as any
  ).collectionSourceContributionBatch.findMany({
    ...cursorArgs(input.cursor),
    orderBy: [
      { periodYear: "desc" },
      { periodMonth: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    select: {
      createdAt: true,
      deductionSource: {
        select: { externalReference: true, id: true, name: true, type: true },
      },
      id: true,
      notes: true,
      periodLabel: true,
      periodMonth: true,
      periodYear: true,
      postedAt: true,
      reference: true,
      status: true,
    },
    take: take + 1,
    where: {
      tenantId: input.tenantId,
      ...(search
        ? {
            OR: [
              { periodLabel: { contains: search, mode: "insensitive" } },
              { reference: { contains: search, mode: "insensitive" } },
              {
                deductionSource: {
                  name: { contains: search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
  })
  const page = pageOf(batches as { id: string }[], take)
  const ids = page.items.map((batch) => batch.id)
  const groups: {
    _count: { _all: number }
    _sum: { expectedAmount: unknown; paidAmount: unknown }
    batchId: string
    status: string
  }[] = ids.length
    ? await (prisma as any).collectionSourceContributionBatchRow.groupBy({
        _count: { _all: true },
        _sum: { expectedAmount: true, paidAmount: true },
        by: ["batchId", "status"],
        where: { batchId: { in: ids }, tenantId: input.tenantId },
      })
    : []
  return {
    data: page.items.map((batch: any) => {
      const own = groups.filter((group) => group.batchId === batch.id)
      const rows = (status: string) =>
        own.find((group) => group.status === status)?._count._all ?? 0
      const sum = (key: "expectedAmount" | "paidAmount", status?: string) =>
        own
          .filter((group) => !status || group.status === status)
          .reduce((total, group) => total + Number(group._sum[key] ?? 0), 0)
      return {
        ...batch,
        deductionSource: {
          ...batch.deductionSource,
          externalReference: batch.deductionSource.externalReference ?? null,
        },
        notes: batch.notes ?? null,
        postedAt: batch.postedAt ?? null,
        reference: batch.reference ?? null,
        totals: {
          blockedRows: rows("blocked"),
          collectedRows: rows("collected"),
          exceptionRows: rows("exception"),
          expectedAmount: sum("expectedAmount"),
          paidAmount: sum("paidAmount"),
          postedAmount: sum("paidAmount", "posted"),
          postedRows: rows("posted"),
          rowCount: own.reduce((total, group) => total + group._count._all, 0),
          skippedRows: rows("skipped"),
          stagedRows: rows("staged"),
        },
      }
    }),
    nextCursor: page.nextCursor,
  }
}

export async function getMobileAdminContributionWorkspace(
  input: {
    capabilities: MobileAdminContributionCapabilities
    cursor?: string | null
    /** Older app builds read stats and sources from every lane page. */
    includeSummary?: boolean
    lane: MobileAdminContributionLane
    search?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const includeSummary = input.includeSummary ?? true
  const lanePage =
    input.lane === "ledger"
      ? ledgerPage(input, prisma)
      : input.lane === "commitments"
        ? commitmentsPage(input, prisma)
        : collectionsPage(input, prisma)
  const [page, summary] = await Promise.all([
    lanePage,
    includeSummary
      ? getMobileAdminContributionSummary(input, prisma)
      : Promise.resolve(null),
  ])
  return {
    capabilities: input.capabilities,
    generatedAt: new Date(),
    lane: input.lane,
    ...page,
    ...(summary
      ? {
          currencyCode: summary.currencyCode,
          stats: summary.stats,
          ...(input.lane === "collections" ? { sources: summary.sources } : {}),
        }
      : {}),
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
      contributions: {
        orderBy: [{ postedAt: "desc" }, { id: "desc" }],
        select: {
          amount: true,
          channel: true,
          id: true,
          postedAt: true,
          reference: true,
          status: true,
        },
        take: 12,
      },
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
      channel: item.channel,
      id: item.id,
      postedAt: item.postedAt,
      reference: item.reference,
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
