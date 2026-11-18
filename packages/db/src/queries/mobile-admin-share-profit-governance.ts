import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { runMobileAdminCommand } from "./mobile-admin-finance-support"
import {
  findMemberShareApplication,
  getMemberUnitSharePosition,
  getTenantSharePolicy,
  listMemberShareApplicationPage,
  publishShareProfitAllocations,
  reviewMemberShareApplication,
} from "./tenant-finance"

export const mobileAdminShareProfitBooks = ["shares", "profit"] as const
export type MobileAdminShareProfitBook =
  (typeof mobileAdminShareProfitBooks)[number]

export type MobileAdminShareProfitCapabilities = {
  approveProfit: boolean
  publishProfit: boolean
  reviewShares: boolean
  view: boolean
}

function getPrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  return prisma as any
}

function fingerprint(value: Record<string, unknown>) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
    )
  )
}

function amount(value: unknown) {
  return Number(value ?? 0)
}

function serializeApplication(
  application: Awaited<
    ReturnType<typeof listMemberShareApplicationPage>
  >["data"][number],
  input: {
    capabilities: MobileAdminShareProfitCapabilities
    shareModel: "monthly_history" | "unit_based"
  }
) {
  return {
    ...application,
    allowedActions:
      input.shareModel === "unit_based" &&
      application.status === "pending" &&
      input.capabilities.reviewShares
        ? (["review"] as const)
        : ([] as const),
    createdAt: application.createdAt.toISOString(),
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
  }
}

type AllocationStats = {
  allocatedAmount: number
  count: number
  draftCount: number
  publishedCount: number
}

const noAllocations: AllocationStats = {
  allocatedAmount: 0,
  count: 0,
  draftCount: 0,
  publishedCount: 0,
}

/**
 * Allocation totals per profit entry from one grouped aggregate, instead of
 * loading every allocation row (and so never judging reconciliation from a
 * truncated list).
 */
async function allocationStats(
  tenantId: string,
  scope: { entryIds: string[] } | { dividendPeriodId: string },
  prisma: any
): Promise<Map<string, AllocationStats>> {
  const stats = new Map<string, AllocationStats>()
  if ("entryIds" in scope && !scope.entryIds.length) return stats
  const groups: Array<{
    _count: { _all: number }
    _sum: { allocatedProfitAmount: unknown }
    profitEntryId: string
    status: string
  }> = await prisma.shareProfitAllocation.groupBy({
    _count: { _all: true },
    _sum: { allocatedProfitAmount: true },
    by: ["profitEntryId", "status"],
    where: {
      tenantId,
      ...("entryIds" in scope
        ? { profitEntryId: { in: scope.entryIds } }
        : {
            profitEntry: {
              linkedDividendPeriodId: scope.dividendPeriodId,
              status: { not: "archived" },
            },
          }),
    },
  })
  for (const group of groups) {
    const current = stats.get(group.profitEntryId) ?? { ...noAllocations }
    current.count += group._count._all
    current.allocatedAmount += amount(group._sum.allocatedProfitAmount)
    if (group.status === "draft") current.draftCount += group._count._all
    if (group.status === "published")
      current.publishedCount += group._count._all
    stats.set(group.profitEntryId, current)
  }
  return stats
}

function serializeProfitEntry(
  entry: any,
  periodStatus: string,
  capabilities: MobileAdminShareProfitCapabilities,
  allocations: AllocationStats = noAllocations
) {
  const allocatableProfit = amount(entry.allocatableProfitAmount)
  const allocationsReconcile =
    allocations.count > 0 &&
    Math.abs(allocations.allocatedAmount - allocatableProfit) < 0.01
  const allowedActions: Array<"approve" | "publish"> = []

  if (
    capabilities.approveProfit &&
    entry.status === "reviewed" &&
    allocationsReconcile &&
    periodStatus === "approved"
  ) {
    allowedActions.push("approve")
  }
  if (
    capabilities.publishProfit &&
    entry.status === "approved" &&
    periodStatus === "approved" &&
    allocations.draftCount === allocations.count &&
    allocations.count > 0
  ) {
    allowedActions.push("publish")
  }

  let blocker: string | null = null
  if (entry.status === "reviewed" && allocations.count === 0) {
    blocker = "Work out shares on the web dashboard before approval."
  } else if (entry.status === "reviewed" && !allocationsReconcile) {
    blocker = "Allocation totals do not reconcile with distributable profit."
  } else if (
    (entry.status === "reviewed" || entry.status === "approved") &&
    periodStatus !== "approved"
  ) {
    blocker = "The linked profit period is not approved."
  }

  return {
    allocatedAmount: allocations.allocatedAmount,
    allocationCount: allocations.count,
    allocationsReconcile,
    allowedActions,
    allocatableProfit,
    blocker,
    businessName: entry.shareBusiness?.name ?? "Business profit",
    expenseAmount: amount(entry.expenseAmount),
    id: entry.id,
    profitAmount: amount(entry.profitAmount),
    profitDate: entry.profitDate.toISOString().slice(0, 10),
    publishedAllocationCount: allocations.publishedCount,
    reason: entry.reason ?? null,
    sourceType: entry.sourceType,
    status: entry.status,
  }
}

function serializeProfitPeriod(
  period: any,
  capabilities: MobileAdminShareProfitCapabilities,
  stats: Map<string, AllocationStats>
) {
  const entries = (period.shareBusinessProfitEntries ?? []).map((entry: any) =>
    serializeProfitEntry(
      entry,
      period.status,
      capabilities,
      stats.get(entry.id)
    )
  )
  const entryExpenses = entries.reduce(
    (total: number, entry: any) => total + entry.expenseAmount,
    0
  )
  return {
    allocationCount: entries.reduce(
      (total: number, entry: any) => total + entry.allocationCount,
      0
    ),
    deductionAmount: amount(period.deductionAmount),
    deductionReason: period.deductionReason ?? null,
    distributableAmount: amount(period.distributableAmount),
    entries,
    entryExpenseAmount: entryExpenses,
    grossProfitAmount: amount(period.totalProfitAmount),
    id: period.id,
    name: period.name,
    pendingApprovalCount: entries.filter(
      (entry: any) => entry.status === "reviewed"
    ).length,
    periodEnd: period.periodEnd.toISOString(),
    periodStart: period.periodStart.toISOString(),
    publishedAt: period.publishedAt?.toISOString() ?? null,
    readyToPublishCount: entries.filter((entry: any) =>
      entry.allowedActions.includes("publish")
    ).length,
    status: period.status,
  }
}

async function shareSummary(tenantId: string, prisma: any) {
  const [pendingCount, pendingUnits, postedCapital, ledgerCount] =
    await Promise.all([
      prisma.memberShareApplication.count({
        where: { status: "pending", tenantId },
      }),
      prisma.memberShareApplication.aggregate({
        _sum: { requestedUnits: true },
        where: { status: "pending", tenantId },
      }),
      prisma.memberShareLedgerEntry.aggregate({
        _sum: { amount: true },
        where: { tenantId },
      }),
      prisma.memberShareLedgerEntry.count({ where: { tenantId } }),
    ])
  return {
    ledgerCount,
    pendingCount,
    pendingUnits: amount(pendingUnits._sum.requestedUnits),
    postedCapital: amount(postedCapital._sum.amount),
  }
}

async function getShareWorkspace(
  input: {
    capabilities: MobileAdminShareProfitCapabilities
    cursor?: string
    includeSummary: boolean
    search?: string
    tenantId: string
  },
  prisma: any
) {
  const search = input.search?.trim() || undefined
  const [policy, page, summary, ledger] = await Promise.all([
    getTenantSharePolicy(input.tenantId, prisma),
    listMemberShareApplicationPage(
      {
        cursor: input.cursor,
        pageSize: 30,
        search,
        status: "pending",
        tenantId: input.tenantId,
      },
      prisma
    ),
    input.includeSummary ? shareSummary(input.tenantId, prisma) : null,
    // Recent postings sit under the first page only.
    input.cursor
      ? []
      : prisma.memberShareLedgerEntry.findMany({
          include: {
            member: {
              select: { fullName: true, id: true, memberNumber: true },
            },
          },
          orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
          take: 12,
          where: {
            tenantId: input.tenantId,
            ...(search
              ? {
                  OR: [
                    { notes: { contains: search, mode: "insensitive" } },
                    {
                      member: {
                        fullName: { contains: search, mode: "insensitive" },
                      },
                    },
                    {
                      member: {
                        memberNumber: { contains: search, mode: "insensitive" },
                      },
                    },
                  ],
                }
              : {}),
          },
        }),
  ])

  return {
    applications: page.data.map((application) =>
      serializeApplication(application, {
        capabilities: input.capabilities,
        shareModel: policy.configurationMode,
      })
    ),
    ledger: ledger.map((entry: any) => ({
      amount: amount(entry.amount),
      createdAt: entry.createdAt.toISOString(),
      effectiveDate: entry.effectiveDate.toISOString(),
      id: entry.id,
      member: entry.member,
      notes: entry.notes ?? null,
      sourceType: entry.sourceType,
    })),
    nextCursor: page.meta.cursor ?? null,
    policy,
    ...(summary ? { summary } : {}),
    total: page.meta.total,
  }
}

async function profitSummary(tenantId: string, prisma: any) {
  const [pendingApprovalCount, readyToPublishCount, unpublished] =
    await Promise.all([
      prisma.shareBusinessProfitEntry.count({
        where: { status: "reviewed", tenantId },
      }),
      prisma.shareBusinessProfitEntry.count({
        where: { status: "approved", tenantId },
      }),
      prisma.dividendPeriod.aggregate({
        _sum: { distributableAmount: true },
        where: { status: { in: ["approved", "draft"] }, tenantId },
      }),
    ])
  return {
    pendingApprovalCount,
    readyToPublishCount,
    unpublishedAmount: amount(unpublished._sum.distributableAmount),
  }
}

async function getProfitWorkspace(
  input: {
    capabilities: MobileAdminShareProfitCapabilities
    cursor?: string
    includeSummary: boolean
    search?: string
    tenantId: string
  },
  prisma: any
) {
  const search = input.search?.trim()
  const where = {
    tenantId: input.tenantId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            {
              shareBusinessProfitEntries: {
                some: {
                  shareBusiness: {
                    name: { contains: search, mode: "insensitive" },
                  },
                },
              },
            },
          ],
        }
      : {}),
  }
  const [rows, total, summary] = await Promise.all([
    prisma.dividendPeriod.findMany({
      cursor: input.cursor ? { id: input.cursor } : undefined,
      include: {
        shareBusinessProfitEntries: {
          include: { shareBusiness: { select: { name: true } } },
          orderBy: [{ profitDate: "desc" }, { createdAt: "desc" }],
          where: { status: { not: "archived" } },
        },
      },
      orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: input.cursor ? 1 : 0,
      take: 21,
      where,
    }),
    // Only the first page carries the total.
    input.cursor ? null : prisma.dividendPeriod.count({ where }),
    input.includeSummary ? profitSummary(input.tenantId, prisma) : null,
  ])
  const hasNextPage = rows.length > 20
  const periods = rows.slice(0, 20)
  const stats = await allocationStats(
    input.tenantId,
    {
      entryIds: periods.flatMap((period: any) =>
        period.shareBusinessProfitEntries.map((entry: any) => entry.id)
      ),
    },
    prisma
  )

  return {
    nextCursor: hasNextPage ? (periods.at(-1)?.id ?? null) : null,
    periods: periods.map((period: any) =>
      serializeProfitPeriod(period, input.capabilities, stats)
    ),
    ...(summary ? { summary } : {}),
    total: total ?? null,
  }
}

/**
 * Header stats for both books, read once per visit: share counts and
 * posted capital, profit approval/publish counts and unpublished profit.
 */
export async function getMobileAdminShareProfitSummary(
  input: {
    capabilities: MobileAdminShareProfitCapabilities
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const [tenant, policy, shares, profit] = await Promise.all([
    prisma.tenant.findUnique({
      select: { currencyCode: true },
      where: { id: input.tenantId },
    }),
    getTenantSharePolicy(input.tenantId, prisma),
    shareSummary(input.tenantId, prisma),
    profitSummary(input.tenantId, prisma),
  ])
  return {
    capabilities: input.capabilities,
    currencyCode: tenant?.currencyCode ?? "NGN",
    generatedAt: new Date().toISOString(),
    policy,
    profit,
    shares,
  }
}

export async function getMobileAdminShareProfitWorkspace(
  input: {
    book: MobileAdminShareProfitBook
    capabilities: MobileAdminShareProfitCapabilities
    cursor?: string
    /** Older app builds read currency and book stats with every page. */
    includeSummary?: boolean
    search?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const includeSummary = input.includeSummary ?? true
  const [tenant, data] = await Promise.all([
    includeSummary
      ? prisma.tenant.findUnique({
          select: { currencyCode: true },
          where: { id: input.tenantId },
        })
      : null,
    input.book === "shares"
      ? getShareWorkspace({ ...input, includeSummary }, prisma)
      : getProfitWorkspace({ ...input, includeSummary }, prisma),
  ])

  return {
    book: input.book,
    capabilities: input.capabilities,
    ...(includeSummary ? { currencyCode: tenant?.currencyCode ?? "NGN" } : {}),
    generatedAt: new Date().toISOString(),
    profit: input.book === "profit" ? data : null,
    shares: input.book === "shares" ? data : null,
  }
}

export async function getMobileAdminShareApplicationDetail(
  input: {
    capabilities: MobileAdminShareProfitCapabilities
    memberShareApplicationId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const [application, policy] = await Promise.all([
    findMemberShareApplication(
      {
        memberShareApplicationId: input.memberShareApplicationId,
        tenantId: input.tenantId,
      },
      prisma
    ),
    getTenantSharePolicy(input.tenantId, prisma),
  ])
  if (!application) {
    throw ExpectedQueryError.notFound("Share application not found.")
  }
  const [position, postedLedger] = await Promise.all([
    policy.configurationMode === "unit_based"
      ? getMemberUnitSharePosition(
          { memberId: application.memberId, tenantId: input.tenantId },
          prisma
        )
      : Promise.resolve(null),
    prisma.memberShareLedgerEntry.findFirst({
      orderBy: { createdAt: "desc" },
      where: {
        sourceId: application.id,
        sourceType: "share_application",
        tenantId: input.tenantId,
      },
    }),
  ])

  return {
    application: serializeApplication(application, {
      capabilities: input.capabilities,
      shareModel: policy.configurationMode,
    }),
    policy,
    position,
    postedLedger: postedLedger
      ? {
          amount: amount(postedLedger.amount),
          effectiveDate: postedLedger.effectiveDate.toISOString(),
          id: postedLedger.id,
        }
      : null,
  }
}

export async function getMobileAdminProfitPeriodDetail(
  input: {
    capabilities: MobileAdminShareProfitCapabilities
    dividendPeriodId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const [period, stats] = await Promise.all([
    prisma.dividendPeriod.findFirst({
      include: {
        allocations: {
          include: {
            member: {
              select: { fullName: true, id: true, memberNumber: true },
            },
          },
          orderBy: { allocationAmount: "desc" },
          take: 30,
        },
        shareBusinessProfitEntries: {
          include: {
            allocations: {
              include: {
                member: {
                  select: { fullName: true, id: true, memberNumber: true },
                },
              },
              orderBy: { allocatedProfitAmount: "desc" },
              take: 30,
            },
            expenseLines: { orderBy: { createdAt: "asc" } },
            shareBusiness: { select: { name: true } },
          },
          orderBy: [{ profitDate: "desc" }, { createdAt: "desc" }],
          where: { status: { not: "archived" } },
        },
      },
      where: { id: input.dividendPeriodId, tenantId: input.tenantId },
    }),
    allocationStats(
      input.tenantId,
      { dividendPeriodId: input.dividendPeriodId },
      prisma
    ),
  ])
  if (!period) throw ExpectedQueryError.notFound("Profit period not found.")

  return {
    period: serializeProfitPeriod(period, input.capabilities, stats),
    periodAllocations: period.allocations.map((item: any) => ({
      allocationAmount: amount(item.allocationAmount),
      id: item.id,
      member: item.member,
      savingsBasisAmount: amount(item.savingsBasisAmount),
    })),
    profitEntries: period.shareBusinessProfitEntries.map((entry: any) => ({
      ...serializeProfitEntry(
        entry,
        period.status,
        input.capabilities,
        stats.get(entry.id)
      ),
      allocations: entry.allocations.map((item: any) => ({
        allocatedProfitAmount: amount(item.allocatedProfitAmount),
        id: item.id,
        member: item.member,
        memberShareBalance: amount(item.memberShareBalance),
        sharePercentage: amount(item.sharePercentage),
        status: item.status,
      })),
      expenseLines: entry.expenseLines.map((item: any) => ({
        amount: amount(item.amount),
        id: item.id,
        reason: item.reason,
      })),
    })),
  }
}

export function reviewMobileAdminShareApplication(input: {
  actorUserId: string
  approvedUnits?: number
  commandId: string
  decision: "approved" | "rejected"
  expectedState: "pending"
  memberShareApplicationId: string
  reviewNotes: string
  tenantId: string
}) {
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: `share_profit.share.${input.decision}`,
    entityId: input.memberShareApplicationId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      const application = await reviewMemberShareApplication(
        {
          actorUserId: input.actorUserId,
          applicationId: input.memberShareApplicationId,
          approvedUnits: input.approvedUnits,
          decision: input.decision,
          expectedStatus: input.expectedState,
          reviewNotes: input.reviewNotes,
          tenantId: input.tenantId,
        },
        prisma
      )
      return { id: application.id, state: application.status }
    },
  })
}

export function approveMobileAdminProfitEntry(input: {
  actorUserId: string
  commandId: string
  expectedState: "reviewed"
  notes: string
  profitEntryId: string
  tenantId: string
}) {
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: "share_profit.profit.approve",
    entityId: input.profitEntryId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) =>
      prisma.$transaction(async (tx: any) => {
        const entry = await tx.shareBusinessProfitEntry.findFirst({
          include: {
            allocations: true,
            linkedDividendPeriod: { select: { status: true } },
          },
          where: { id: input.profitEntryId, tenantId: input.tenantId },
        })
        if (!entry) {
          throw ExpectedQueryError.notFound("Business profit entry not found.")
        }
        if (entry.status !== input.expectedState) {
          throw ExpectedQueryError.conflict(
            "Only reviewed profit entries can be approved. Refresh and try again."
          )
        }
        if (entry.linkedDividendPeriod?.status !== "approved") {
          throw ExpectedQueryError.precondition(
            "The linked profit period must be approved first."
          )
        }
        if (entry.allocations.length === 0) {
          throw ExpectedQueryError.precondition(
            "Work out shares on the web dashboard before approval."
          )
        }
        const allocatedAmount = entry.allocations.reduce(
          (total: number, item: any) =>
            total + amount(item.allocatedProfitAmount),
          0
        )
        if (
          Math.abs(allocatedAmount - amount(entry.allocatableProfitAmount)) >=
          0.01
        ) {
          throw ExpectedQueryError.precondition(
            "Allocation totals do not reconcile with distributable profit."
          )
        }
        const claim = await tx.shareBusinessProfitEntry.updateMany({
          data: { notes: input.notes, status: "approved" },
          where: {
            id: input.profitEntryId,
            status: input.expectedState,
            tenantId: input.tenantId,
          },
        })
        if (claim.count !== 1) {
          throw ExpectedQueryError.conflict(
            "The profit entry changed before approval. Refresh and try again."
          )
        }
        await tx.auditLog.create({
          data: {
            action: "share_business_profit_entry.approved",
            actorType: "user",
            actorUserId: input.actorUserId,
            entityId: input.profitEntryId,
            entityType: "ShareBusinessProfitEntry",
            metadata: {
              allocatedAmount,
              allocationCount: entry.allocations.length,
              notes: input.notes,
              previousState: input.expectedState,
            },
            occurredAt: new Date(),
            tenantId: input.tenantId,
          },
        })
        return { id: entry.id, state: "approved" }
      }),
  })
}

export function publishMobileAdminProfitEntry(input: {
  actorUserId: string
  commandId: string
  expectedState: "approved"
  profitEntryId: string
  tenantId: string
}) {
  return runMobileAdminCommand({
    actorUserId: input.actorUserId,
    commandFingerprint: fingerprint(input),
    commandId: input.commandId,
    commandType: "share_profit.profit.publish",
    entityId: input.profitEntryId,
    expectedState: input.expectedState,
    tenantId: input.tenantId,
    execute: async (prisma) => {
      await publishShareProfitAllocations(
        {
          actorUserId: input.actorUserId,
          expectedStatus: input.expectedState,
          profitEntryId: input.profitEntryId,
          tenantId: input.tenantId,
        },
        prisma
      )
      return { id: input.profitEntryId, state: "completed" }
    },
  })
}
