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
  application: Awaited<ReturnType<typeof listMemberShareApplicationPage>>["data"][number],
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

function allocationSummary(allocations: Array<any>) {
  const draft = allocations.filter((item) => item.status === "draft")
  const published = allocations.filter((item) => item.status === "published")
  return {
    allocatedAmount: allocations.reduce(
      (total, item) => total + amount(item.allocatedProfitAmount),
      0
    ),
    count: allocations.length,
    draftCount: draft.length,
    publishedCount: published.length,
  }
}

function serializeProfitEntry(
  entry: any,
  periodStatus: string,
  capabilities: MobileAdminShareProfitCapabilities
) {
  const allocations = allocationSummary(entry.allocations ?? [])
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
    blocker = "Build member allocations on the web workspace before approval."
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
  capabilities: MobileAdminShareProfitCapabilities
) {
  const entries = (period.shareBusinessProfitEntries ?? []).map((entry: any) =>
    serializeProfitEntry(entry, period.status, capabilities)
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
    readyToPublishCount: entries.filter(
      (entry: any) => entry.allowedActions.includes("publish")
    ).length,
    status: period.status,
  }
}

async function getShareWorkspace(
  input: {
    capabilities: MobileAdminShareProfitCapabilities
    cursor?: string
    search?: string
    tenantId: string
  },
  prisma: any
) {
  const policy = await getTenantSharePolicy(input.tenantId, prisma)
  const search = input.search?.trim() || undefined
  const [page, pendingCount, pendingUnits, postedCapital, ledgerCount, ledger] =
    await Promise.all([
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
      prisma.memberShareApplication.count({
        where: { status: "pending", tenantId: input.tenantId },
      }),
      prisma.memberShareApplication.aggregate({
        _sum: { requestedUnits: true },
        where: { status: "pending", tenantId: input.tenantId },
      }),
      prisma.memberShareLedgerEntry.aggregate({
        _sum: { amount: true },
        where: { tenantId: input.tenantId },
      }),
      prisma.memberShareLedgerEntry.count({
        where: { tenantId: input.tenantId },
      }),
      prisma.memberShareLedgerEntry.findMany({
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
    summary: {
      ledgerCount,
      pendingCount,
      pendingUnits: amount(pendingUnits._sum.requestedUnits),
      postedCapital: amount(postedCapital._sum.amount),
    },
    total: page.meta.total,
  }
}

async function getProfitWorkspace(
  input: {
    capabilities: MobileAdminShareProfitCapabilities
    cursor?: string
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
  const [rows, total, pendingApprovalCount, readyToPublishCount, unpublished] =
    await Promise.all([
      prisma.dividendPeriod.findMany({
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          shareBusinessProfitEntries: {
            include: {
              allocations: {
                select: {
                  allocatedProfitAmount: true,
                  status: true,
                },
              },
              shareBusiness: { select: { name: true } },
            },
            orderBy: [{ profitDate: "desc" }, { createdAt: "desc" }],
            where: { status: { not: "archived" } },
          },
        },
        orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
        skip: input.cursor ? 1 : 0,
        take: 31,
        where,
      }),
      prisma.dividendPeriod.count({ where }),
      prisma.shareBusinessProfitEntry.count({
        where: { status: "reviewed", tenantId: input.tenantId },
      }),
      prisma.shareBusinessProfitEntry.count({
        where: { status: "approved", tenantId: input.tenantId },
      }),
      prisma.dividendPeriod.aggregate({
        _sum: { distributableAmount: true },
        where: {
          status: { in: ["approved", "draft"] },
          tenantId: input.tenantId,
        },
      }),
    ])
  const hasNextPage = rows.length > 30
  const periods = rows.slice(0, 30)

  return {
    nextCursor: hasNextPage ? (periods.at(-1)?.id ?? null) : null,
    periods: periods.map((period: any) =>
      serializeProfitPeriod(period, input.capabilities)
    ),
    summary: {
      pendingApprovalCount,
      readyToPublishCount,
      unpublishedAmount: amount(unpublished._sum.distributableAmount),
    },
    total,
  }
}

export async function getMobileAdminShareProfitWorkspace(
  input: {
    book: MobileAdminShareProfitBook
    capabilities: MobileAdminShareProfitCapabilities
    cursor?: string
    search?: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const tenant = await prisma.tenant.findUnique({
    select: { currencyCode: true },
    where: { id: input.tenantId },
  })
  const data =
    input.book === "shares"
      ? await getShareWorkspace(input, prisma)
      : await getProfitWorkspace(input, prisma)

  return {
    book: input.book,
    capabilities: input.capabilities,
    currencyCode: tenant?.currencyCode ?? "NGN",
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
  const application = await findMemberShareApplication(
    {
      memberShareApplicationId: input.memberShareApplicationId,
      tenantId: input.tenantId,
    },
    prisma
  )
  if (!application) {
    throw ExpectedQueryError.notFound("Share application not found.")
  }
  const policy = await getTenantSharePolicy(input.tenantId, prisma)
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
  const period = await prisma.dividendPeriod.findFirst({
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
  })
  if (!period) throw ExpectedQueryError.notFound("Profit period not found.")

  return {
    period: serializeProfitPeriod(period, input.capabilities),
    periodAllocations: period.allocations.map((item: any) => ({
      allocationAmount: amount(item.allocationAmount),
      id: item.id,
      member: item.member,
      savingsBasisAmount: amount(item.savingsBasisAmount),
    })),
    profitEntries: period.shareBusinessProfitEntries.map((entry: any) => ({
      ...serializeProfitEntry(entry, period.status, input.capabilities),
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
            "Build member allocations on the web workspace before approval."
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
