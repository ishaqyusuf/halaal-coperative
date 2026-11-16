import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import { getTenantMigrationWriteAccess } from "./migration"
import { runMobileAdminCommand } from "./mobile-admin-finance-support"
import { recordProfitOwedForSeason } from "./profit-payouts"
import {
  generateShareProfitAllocations,
  rebuildDividendPeriodAllocationsFromPublishedProfit,
} from "./tenant-finance"

/**
 * Dashboard reads and season commands for `/business`: only the fields each
 * screen shows, totals summed in SQL. Member shares are read one page at a
 * time; nothing loads every member allocation.
 */

export type BusinessRowStatus = "planned" | "active" | "completed" | "archived"

export type BusinessListFilters = {
  cursor?: string | null
  pageSize?: number
  q?: string | null
  status?: BusinessRowStatus | null
}

type BusinessProfitTotalsRow = {
  id: string
  last_profit_date: Date | null
  profit_count: bigint
  profit_total: string
  shared_total: string
  waiting_total: string
}

function getPrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  return prisma
}

function dateOnly(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null
}

function money(value: unknown) {
  return Math.round(Number(value ?? 0) * 100) / 100
}

/** A profit entry counts as shared once any of its member shares is published. */
const publishedAllocationExists = (entryAlias: string) =>
  `EXISTS (SELECT 1 FROM share_profit_allocations a WHERE a.profit_entry_id = ${entryAlias}.id AND a.status::text = 'published')`

/** Businesses, newest first, with their profit totals in one grouped query. */
export async function listBusinessRows(
  tenantId: string,
  filters: BusinessListFilters = {},
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const pageSize = filters.pageSize ?? 25
  const offset = Number.parseInt(filters.cursor ?? "0", 10)
  const skip = Number.isFinite(offset) && offset > 0 ? offset : 0
  const q = filters.q?.trim()

  const rows = await prisma.shareBusiness.findMany({
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    select: {
      capitalAmount: true,
      endDate: true,
      id: true,
      name: true,
      notes: true,
      startDate: true,
      status: true,
      systemKey: true,
    },
    skip,
    take: pageSize + 1,
    where: {
      tenantId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { notes: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
  })
  const hasNextPage = rows.length > pageSize
  const page = hasNextPage ? rows.slice(0, pageSize) : rows
  const totals = page.length
    ? await readBusinessProfitTotals(
        prisma,
        tenantId,
        page.map((row) => row.id)
      )
    : new Map<string, BusinessProfitTotalsRow>()

  return {
    data: page.map((row) => {
      const total = totals.get(row.id)

      return {
        capitalAmount: money(row.capitalAmount),
        endDate: dateOnly(row.endDate),
        id: row.id,
        /** Kept by Halaalvest (procurement and foodstuff profit); read-only. */
        isAutomatic: Boolean(row.systemKey),
        lastProfitDate: dateOnly(total?.last_profit_date),
        name: row.name,
        notes: row.notes,
        profitCount: Number(total?.profit_count ?? 0),
        profitTotal: money(total?.profit_total),
        sharedTotal: money(total?.shared_total),
        startDate: dateOnly(row.startDate) as string,
        status: row.status as BusinessRowStatus,
        waitingTotal: money(total?.waiting_total),
      }
    }),
    meta: {
      cursor: hasNextPage ? String(skip + pageSize) : null,
      hasNextPage,
    },
  }
}

async function readBusinessProfitTotals(
  prisma: PrismaClient,
  tenantId: string,
  businessIds: string[]
) {
  const rows = await prisma.$queryRawUnsafe<BusinessProfitTotalsRow[]>(
    `SELECT e.share_business_id::text AS id,
        count(*) AS profit_count,
        coalesce(sum(e.allocatable_profit_amount), 0)::text AS profit_total,
        coalesce(sum(e.allocatable_profit_amount) FILTER (WHERE ${publishedAllocationExists("e")}), 0)::text AS shared_total,
        coalesce(sum(e.allocatable_profit_amount) FILTER (WHERE NOT ${publishedAllocationExists("e")}), 0)::text AS waiting_total,
        max(e.profit_date) AS last_profit_date
      FROM share_business_profit_entries e
      WHERE e.tenant_id = $1::uuid
        AND e.share_business_id = ANY($2::uuid[])
        AND e.status::text <> 'archived'
      GROUP BY e.share_business_id`,
    tenantId,
    businessIds
  )

  return new Map(rows.map((row) => [row.id, row]))
}

/** The four numbers above the business list, in one statement. */
export async function getBusinessPageSummary(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const [row] = await prisma.$queryRawUnsafe<
    Array<{
      active_capital: string
      running_count: bigint
      shared_total: string
      waiting_total: string
    }>
  >(
    `SELECT
        (SELECT coalesce(sum(capital_amount), 0)::text FROM share_businesses
          WHERE tenant_id = $1::uuid AND status::text = 'active') AS active_capital,
        (SELECT count(*) FROM share_businesses
          WHERE tenant_id = $1::uuid AND status::text = 'active') AS running_count,
        (SELECT coalesce(sum(e.allocatable_profit_amount), 0)::text
          FROM share_business_profit_entries e
          WHERE e.tenant_id = $1::uuid AND e.status::text <> 'archived'
            AND NOT ${publishedAllocationExists("e")}) AS waiting_total,
        (SELECT coalesce(sum(allocated_profit_amount), 0)::text
          FROM share_profit_allocations
          WHERE tenant_id = $1::uuid AND status::text = 'published') AS shared_total`,
    tenantId
  )

  return {
    activeCapital: money(row?.active_capital),
    runningCount: Number(row?.running_count ?? 0),
    sharedTotal: money(row?.shared_total),
    waitingTotal: money(row?.waiting_total),
  }
}

/** One business with its profit history (newest first) for the details sheet. */
export async function getBusinessDetail(
  input: { businessId: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const business = await prisma.shareBusiness.findFirst({
    select: {
      capitalAmount: true,
      endDate: true,
      id: true,
      linkedDividendPeriodId: true,
      name: true,
      notes: true,
      profitAmount: true,
      profitEntries: {
        orderBy: [{ profitDate: "desc" }, { createdAt: "desc" }],
        select: {
          _count: {
            select: { allocations: { where: { status: "published" } } },
          },
          allocatableProfitAmount: true,
          expenseAmount: true,
          id: true,
          linkedDividendPeriod: {
            select: { id: true, name: true, status: true },
          },
          notes: true,
          profitAmount: true,
          profitDate: true,
          reason: true,
          sourceType: true,
          status: true,
        },
        take: 60,
        where: { status: { not: "archived" } },
      },
      startDate: true,
      status: true,
      systemKey: true,
    },
    where: { id: input.businessId, tenantId: input.tenantId },
  })

  if (!business) return null

  const profitEntries = business.profitEntries.map((entry) => ({
    allocatableProfitAmount: money(entry.allocatableProfitAmount),
    expenseAmount: money(entry.expenseAmount),
    id: entry.id,
    isShared: entry._count.allocations > 0,
    notes: entry.notes,
    profitAmount: money(entry.profitAmount),
    profitDate: dateOnly(entry.profitDate) as string,
    reason: entry.reason,
    season: entry.linkedDividendPeriod,
    sourceType: entry.sourceType,
    status: entry.status,
  }))

  return {
    capitalAmount: money(business.capitalAmount),
    endDate: dateOnly(business.endDate),
    id: business.id,
    isAutomatic: Boolean(business.systemKey),
    linkedDividendPeriodId: business.linkedDividendPeriodId,
    name: business.name,
    notes: business.notes,
    profitAmount: money(business.profitAmount),
    profitEntries,
    profitTotal: money(
      profitEntries.reduce(
        (total, entry) => total + entry.allocatableProfitAmount,
        0
      )
    ),
    sharedTotal: money(
      profitEntries
        .filter((entry) => entry.isShared)
        .reduce((total, entry) => total + entry.allocatableProfitAmount, 0)
    ),
    startDate: dateOnly(business.startDate) as string,
    status: business.status as BusinessRowStatus,
  }
}

/**
 * A repeat of the same profit (same business, date and amounts) saved in the
 * last ten minutes: a double tap or a resubmitted form.
 */
export async function findRecentDuplicateProfitEntry(
  input: {
    expenseAmount: number
    profitAmount: number
    profitDate: Date
    shareBusinessId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)

  return prisma.shareBusinessProfitEntry.findFirst({
    select: { id: true },
    where: {
      createdAt: { gte: new Date(Date.now() - 10 * 60_000) },
      expenseAmount: input.expenseAmount,
      profitAmount: input.profitAmount,
      profitDate: input.profitDate,
      shareBusinessId: input.shareBusinessId,
      status: { not: "archived" },
      tenantId: input.tenantId,
    },
  })
}

type SeasonEntryTotalsRow = {
  allocated_total: string
  allocation_count: bigint
  draft_count: bigint
  profit_entry_id: string
  published_count: bigint
}

/** Profit-sharing seasons, newest first, with the profit recorded in each. */
export async function listProfitSeasons(
  tenantId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const [periods, totals] = await Promise.all([
    prisma.dividendPeriod.findMany({
      orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
      select: {
        distributableAmount: true,
        id: true,
        name: true,
        periodEnd: true,
        periodStart: true,
        publishedAt: true,
        status: true,
      },
      take: 40,
      where: { tenantId },
    }),
    prisma.shareBusinessProfitEntry.groupBy({
      _count: { _all: true },
      _sum: { allocatableProfitAmount: true },
      by: ["linkedDividendPeriodId"],
      where: { status: { not: "archived" }, tenantId },
    }),
  ])
  const totalsBySeason = new Map(
    totals.map((row) => [row.linkedDividendPeriodId, row])
  )

  return periods.map((period) => {
    const total = totalsBySeason.get(period.id)
    const recorded = money(total?._sum.allocatableProfitAmount)

    return {
      id: period.id,
      name: period.name,
      periodEnd: dateOnly(period.periodEnd) as string,
      periodStart: dateOnly(period.periodStart) as string,
      profitCount: total?._count._all ?? 0,
      publishedAt: dateOnly(period.publishedAt),
      status: period.status,
      toShare:
        period.status === "draft"
          ? recorded
          : money(period.distributableAmount),
    }
  })
}

/** One season: its totals, its profit entries and where member shares stand. */
const membersWithNothingLimit = 20

export async function getProfitSeasonDetail(
  input: { seasonId: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const [period, entries, entryTotals, memberTotals, leftOut, payoutTotals] =
    await Promise.all([
      prisma.dividendPeriod.findFirst({
        select: {
          deductionAmount: true,
          distributableAmount: true,
          id: true,
          name: true,
          periodEnd: true,
          periodStart: true,
          publishedAt: true,
          status: true,
          totalProfitAmount: true,
        },
        where: { id: input.seasonId, tenantId: input.tenantId },
      }),
      prisma.shareBusinessProfitEntry.findMany({
        orderBy: [{ profitDate: "desc" }, { createdAt: "desc" }],
        select: {
          allocatableProfitAmount: true,
          expenseAmount: true,
          id: true,
          profitAmount: true,
          profitDate: true,
          shareBusiness: { select: { id: true, name: true } },
          sourceType: true,
          status: true,
        },
        where: {
          linkedDividendPeriodId: input.seasonId,
          status: { not: "archived" },
          tenantId: input.tenantId,
        },
      }),
      prisma.$queryRawUnsafe<SeasonEntryTotalsRow[]>(
        `SELECT a.profit_entry_id::text AS profit_entry_id,
          count(*) AS allocation_count,
          count(*) FILTER (WHERE a.status::text = 'draft') AS draft_count,
          count(*) FILTER (WHERE a.status::text = 'published') AS published_count,
          coalesce(sum(a.allocated_profit_amount), 0)::text AS allocated_total
        FROM share_profit_allocations a
        JOIN share_business_profit_entries e ON e.id = a.profit_entry_id
        WHERE a.tenant_id = $1::uuid AND e.linked_dividend_period_id = $2::uuid
          AND e.status::text <> 'archived' AND a.status::text <> 'cancelled'
        GROUP BY a.profit_entry_id`,
        input.tenantId,
        input.seasonId
      ),
      prisma.$queryRawUnsafe<Array<{ member_count: bigint; total: string }>>(
        `SELECT count(DISTINCT a.member_id) AS member_count,
          coalesce(sum(a.allocated_profit_amount), 0)::text AS total
        FROM share_profit_allocations a
        JOIN share_business_profit_entries e ON e.id = a.profit_entry_id
        WHERE a.tenant_id = $1::uuid AND e.linked_dividend_period_id = $2::uuid
          AND e.status::text <> 'archived' AND a.status::text <> 'cancelled'`,
        input.tenantId,
        input.seasonId
      ),
      // Active members with no share in this season (no share capital on the
      // profit date): named in "Who gets what" so nobody is silently left out.
      prisma.$queryRawUnsafe<Array<{ full_name: string; total: bigint }>>(
        `SELECT m.full_name, count(*) OVER () AS total
        FROM members m
        WHERE m.tenant_id = $1::uuid AND m.status::text = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM share_profit_allocations a
            JOIN share_business_profit_entries e ON e.id = a.profit_entry_id
            WHERE a.tenant_id = $1::uuid AND a.member_id = m.id
              AND e.linked_dividend_period_id = $2::uuid
              AND e.status::text <> 'archived' AND a.status::text <> 'cancelled'
          )
        ORDER BY m.full_name
        LIMIT ${membersWithNothingLimit}`,
        input.tenantId,
        input.seasonId
      ),
      // Who is paid and who is still owed once the season is shared (1.1).
      prisma.$queryRawUnsafe<
        Array<{
          owed_count: bigint
          owed_total: string
          paid_count: bigint
          paid_total: string
        }>
      >(
        `SELECT
          count(*) FILTER (WHERE p.status::text = 'paid') AS paid_count,
          coalesce(sum(p.amount) FILTER (WHERE p.status::text = 'paid'), 0)::text AS paid_total,
          count(*) FILTER (WHERE p.id IS NULL OR p.status::text <> 'paid') AS owed_count,
          coalesce(sum(d.allocation_amount) FILTER (WHERE p.id IS NULL OR p.status::text <> 'paid'), 0)::text AS owed_total
        FROM dividend_allocations d
        LEFT JOIN profit_payouts p ON p.dividend_period_id = d.dividend_period_id
          AND p.member_id = d.member_id
        WHERE d.tenant_id = $1::uuid AND d.dividend_period_id = $2::uuid
          AND d.allocation_amount > 0`,
        input.tenantId,
        input.seasonId
      ),
    ])

  if (!period) return null

  const totalsByEntry = new Map(
    entryTotals.map((row) => [row.profit_entry_id, row])
  )
  const serializedEntries = entries.map((entry) => {
    const total = totalsByEntry.get(entry.id)
    const toShare = money(entry.allocatableProfitAmount)
    const allocated = money(total?.allocated_total)
    const allocationCount = Number(total?.allocation_count ?? 0)
    const publishedCount = Number(total?.published_count ?? 0)

    return {
      businessId: entry.shareBusiness.id,
      businessName: entry.shareBusiness.name,
      expenseAmount: money(entry.expenseAmount),
      id: entry.id,
      isShared: publishedCount > 0,
      profitAmount: money(entry.profitAmount),
      profitDate: dateOnly(entry.profitDate) as string,
      sharesReady: allocationCount > 0 && Math.abs(allocated - toShare) < 0.01,
      status: entry.status,
      toShare,
    }
  })
  const recordedProfit = money(
    serializedEntries.reduce((total, entry) => total + entry.profitAmount, 0)
  )
  const recordedCosts = money(
    serializedEntries.reduce((total, entry) => total + entry.expenseAmount, 0)
  )
  const recordedToShare = money(
    serializedEntries.reduce((total, entry) => total + entry.toShare, 0)
  )
  const unshared = serializedEntries.filter((entry) => !entry.isShared)
  const members = memberTotals[0]
  const payouts = payoutTotals[0]
  // Seasons brought in from before Halaalvest were settled outside it.
  const hasLiveProfit = entries.some((entry) => entry.sourceType === "manual")

  return {
    entries: serializedEntries,
    id: period.id,
    memberCount: Number(members?.member_count ?? 0),
    membersWithNothing: {
      count: Number(leftOut[0]?.total ?? 0),
      names: leftOut.map((row) => row.full_name),
    },
    name: period.name,
    payout:
      period.status === "published" && hasLiveProfit
        ? {
            owedCount: Number(payouts?.owed_count ?? 0),
            owedTotal: money(payouts?.owed_total),
            paidCount: Number(payouts?.paid_count ?? 0),
            paidTotal: money(payouts?.paid_total),
          }
        : null,
    periodEnd: dateOnly(period.periodEnd) as string,
    periodStart: dateOnly(period.periodStart) as string,
    publishedAt: dateOnly(period.publishedAt),
    sharesNeedWorkingOut: unshared.some((entry) => !entry.sharesReady),
    sharesTotal: money(members?.total),
    status: period.status,
    totals:
      period.status === "draft"
        ? {
            costs: recordedCosts,
            profit: recordedProfit,
            toShare: recordedToShare,
          }
        : {
            costs: money(recordedCosts + money(period.deductionAmount)),
            profit: money(period.totalProfitAmount),
            toShare: money(period.distributableAmount),
          },
    unsharedCount: unshared.length,
  }
}

/** Who gets what this season: one page of members, largest share first. */
export async function listProfitSeasonShares(
  input: {
    cursor?: string | null
    pageSize?: number
    /** Only members still owed, or only members paid (shared seasons). */
    payout?: "owed" | "paid" | null
    q?: string | null
    seasonId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  const pageSize = input.pageSize ?? 50
  const offset = Number.parseInt(input.cursor ?? "0", 10)
  const skip = Number.isFinite(offset) && offset > 0 ? offset : 0
  const q = input.q?.trim() ? `%${input.q.trim()}%` : null
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      amount: string
      full_name: string
      member_id: string
      member_number: string | null
      paid_at: Date | null
      payout_destination: "bank_transfer" | "cash" | "savings" | null
      payout_id: string | null
      payout_reference: string | null
      payout_status: "paid" | "reversed" | null
      published: boolean
    }>
  >(
    `SELECT a.member_id::text AS member_id, m.full_name, m.member_number,
        coalesce(sum(a.allocated_profit_amount), 0)::text AS amount,
        bool_and(a.status::text = 'published') AS published,
        p.id::text AS payout_id, p.status::text AS payout_status,
        p.destination::text AS payout_destination, p.paid_at,
        p.reference AS payout_reference
      FROM share_profit_allocations a
      JOIN share_business_profit_entries e ON e.id = a.profit_entry_id
      JOIN members m ON m.id = a.member_id
      LEFT JOIN profit_payouts p ON p.tenant_id = a.tenant_id
        AND p.dividend_period_id = $2::uuid AND p.member_id = a.member_id
      WHERE a.tenant_id = $1::uuid AND e.linked_dividend_period_id = $2::uuid
        AND e.status::text <> 'archived' AND a.status::text <> 'cancelled'
        AND ($3::text IS NULL OR m.full_name ILIKE $3 OR m.member_number ILIKE $3)
        AND ($6::text IS NULL
          OR ($6::text = 'paid' AND p.status::text = 'paid')
          OR ($6::text = 'owed' AND (p.id IS NULL OR p.status::text <> 'paid')))
      GROUP BY a.member_id, m.full_name, m.member_number, p.id
      ORDER BY sum(a.allocated_profit_amount) DESC, m.full_name ASC
      LIMIT $4 OFFSET $5`,
    input.tenantId,
    input.seasonId,
    q,
    pageSize + 1,
    skip,
    input.payout ?? null
  )
  const hasNextPage = rows.length > pageSize
  const page = hasNextPage ? rows.slice(0, pageSize) : rows

  return {
    data: page.map((row) => ({
      amount: money(row.amount),
      memberId: row.member_id,
      memberName: row.full_name,
      memberNumber: row.member_number,
      payout:
        row.payout_id && row.payout_status === "paid"
          ? {
              destination: row.payout_destination ?? "savings",
              id: row.payout_id,
              paidAt: dateOnly(row.paid_at) as string,
              reference: row.payout_reference,
            }
          : null,
      published: row.published,
    })),
    meta: {
      cursor: hasNextPage ? String(skip + pageSize) : null,
      hasNextPage,
    },
  }
}

async function assertLiveProfitSharingOpen(
  prisma: PrismaClient,
  tenantId: string
) {
  const access = await getTenantMigrationWriteAccess(tenantId, prisma)

  if (!access.canUseLiveFinancialWrites) {
    throw ExpectedQueryError.precondition(
      "Profit can be shared once the cooperative is fully set up."
    )
  }
}

/**
 * Close a season: no more profit can be added, and its totals are fixed so
 * member shares can be worked out. Only an open (draft) season closes, once.
 */
export async function closeProfitSeason(
  input: {
    actorUserId: string
    commandId: string
    seasonId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  await assertLiveProfitSharingOpen(prisma, input.tenantId)

  return runMobileAdminCommand(
    {
      actorUserId: input.actorUserId,
      commandFingerprint: JSON.stringify({ seasonId: input.seasonId }),
      commandId: input.commandId,
      commandType: "business.profit_season.close",
      entityId: input.seasonId,
      expectedState: "draft",
      tenantId: input.tenantId,
      execute: async (client) =>
        (client as any).$transaction(
          async (tx: any) => {
            const entries = await tx.shareBusinessProfitEntry.findMany({
              select: {
                allocatableProfitAmount: true,
                expenseAmount: true,
                id: true,
                profitAmount: true,
              },
              where: {
                linkedDividendPeriodId: input.seasonId,
                status: { not: "archived" },
                tenantId: input.tenantId,
              },
            })

            if (entries.length === 0) {
              throw ExpectedQueryError.precondition(
                "Record profit in this season before closing it."
              )
            }

            const sum = (key: string) =>
              money(
                entries.reduce(
                  (total: number, entry: any) =>
                    total + Number(entry[key] ?? 0),
                  0
                )
              )
            const claim = await tx.dividendPeriod.updateMany({
              data: {
                distributableAmount: sum("allocatableProfitAmount"),
                status: "approved",
                totalProfitAmount: sum("profitAmount"),
              },
              where: {
                id: input.seasonId,
                status: "draft",
                tenantId: input.tenantId,
              },
            })

            if (claim.count !== 1) {
              throw ExpectedQueryError.conflict(
                "This season is already closed. Refresh to see it."
              )
            }

            await tx.shareBusinessProfitEntry.updateMany({
              data: { status: "reviewed" },
              where: {
                linkedDividendPeriodId: input.seasonId,
                status: { in: ["draft", "pending"] },
                tenantId: input.tenantId,
              },
            })
            await tx.auditLog.create({
              data: {
                action: "business.profit_season.closed",
                actorType: "user",
                actorUserId: input.actorUserId,
                entityId: input.seasonId,
                entityType: "DividendPeriod",
                metadata: {
                  costs: sum("expenseAmount"),
                  profit: sum("profitAmount"),
                  profitEntryCount: entries.length,
                  toShare: sum("allocatableProfitAmount"),
                },
                occurredAt: new Date(),
                tenantId: input.tenantId,
              },
            })

            return { id: input.seasonId, state: "approved" }
          },
          { maxWait: 5_000, timeout: 15_000 }
        ),
    },
    prisma
  )
}

/**
 * Work out each member's share for every profit in a closed season that is
 * not shared yet (drafts only; members see nothing until it is shared).
 */
export async function workOutProfitSeasonShares(
  input: { actorUserId: string; seasonId: string; tenantId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  await assertLiveProfitSharingOpen(prisma, input.tenantId)

  const period = await prisma.dividendPeriod.findFirst({
    select: { status: true },
    where: { id: input.seasonId, tenantId: input.tenantId },
  })

  if (!period) throw ExpectedQueryError.notFound("Season not found.")
  if (period.status !== "approved") {
    throw ExpectedQueryError.conflict(
      period.status === "draft"
        ? "Close the season before working out shares."
        : "This season has already been shared."
    )
  }

  const entries = await prisma.shareBusinessProfitEntry.findMany({
    select: { id: true },
    where: {
      allocations: { none: { status: "published" } },
      linkedDividendPeriodId: input.seasonId,
      status: { in: ["reviewed", "approved"] },
      tenantId: input.tenantId,
    },
  })

  for (const entry of entries) {
    try {
      await generateShareProfitAllocations(
        {
          actorUserId: input.actorUserId,
          profitEntryId: entry.id,
          tenantId: input.tenantId,
        },
        prisma
      )
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("No member share balances")
      ) {
        throw ExpectedQueryError.precondition(
          "No member had share capital on the profit date, so there is no one to share it with yet."
        )
      }

      throw error
    }
  }

  return { profitCount: entries.length }
}

/**
 * Share a closed season with members: every worked-out profit is approved and
 * published in one transaction, the season's member totals are rebuilt and
 * the season is marked shared. A repeat (same command or a second tab) is
 * refused because the season is no longer waiting.
 */
export async function shareProfitSeason(
  input: {
    actorUserId: string
    commandId: string
    /** Optional approval note (for example the board meeting), kept on record. */
    note?: string | null
    seasonId: string
    tenantId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)
  await assertLiveProfitSharingOpen(prisma, input.tenantId)

  return runMobileAdminCommand(
    {
      actorUserId: input.actorUserId,
      commandFingerprint: JSON.stringify({ seasonId: input.seasonId }),
      commandId: input.commandId,
      commandType: "business.profit_season.share",
      entityId: input.seasonId,
      expectedState: "approved",
      tenantId: input.tenantId,
      execute: async (client) =>
        (client as any).$transaction(
          async (tx: any) => {
            const period = await tx.dividendPeriod.findFirst({
              select: { status: true },
              where: { id: input.seasonId, tenantId: input.tenantId },
            })

            if (!period) throw ExpectedQueryError.notFound("Season not found.")
            if (period.status !== "approved") {
              throw ExpectedQueryError.conflict(
                period.status === "draft"
                  ? "Close the season before sharing it."
                  : "This season has already been shared."
              )
            }

            const entries = await tx.shareBusinessProfitEntry.findMany({
              select: {
                allocatableProfitAmount: true,
                allocations: {
                  select: { allocatedProfitAmount: true, status: true },
                  where: { status: { not: "cancelled" } },
                },
                id: true,
                status: true,
              },
              where: {
                linkedDividendPeriodId: input.seasonId,
                status: { not: "archived" },
                tenantId: input.tenantId,
              },
            })
            const toShare = entries.filter(
              (entry: any) =>
                !entry.allocations.some(
                  (allocation: any) => allocation.status === "published"
                )
            )

            if (toShare.length === 0) {
              throw ExpectedQueryError.conflict(
                "Everything in this season has already been shared."
              )
            }

            for (const entry of toShare) {
              const allocated = entry.allocations.reduce(
                (total: number, allocation: any) =>
                  total + Number(allocation.allocatedProfitAmount),
                0
              )

              if (
                entry.allocations.length === 0 ||
                Math.abs(allocated - Number(entry.allocatableProfitAmount)) >=
                  0.01
              ) {
                throw ExpectedQueryError.precondition(
                  "Work out members' shares before sharing."
                )
              }
            }

            const ids = toShare.map((entry: any) => entry.id)
            const claim = await tx.shareBusinessProfitEntry.updateMany({
              data: { status: "completed" },
              where: {
                id: { in: ids },
                status: { in: ["reviewed", "approved"] },
                tenantId: input.tenantId,
              },
            })

            if (claim.count !== ids.length) {
              throw ExpectedQueryError.conflict(
                "This season changed while you were looking. Refresh and try again."
              )
            }

            const published = await tx.shareProfitAllocation.updateMany({
              data: { status: "published" },
              where: {
                profitEntryId: { in: ids },
                status: "draft",
                tenantId: input.tenantId,
              },
            })
            const summary =
              await rebuildDividendPeriodAllocationsFromPublishedProfit(
                { dividendPeriodId: input.seasonId, tenantId: input.tenantId },
                tx
              )
            // Fully shared: each member's share is now owed to them (1.1).
            const owed = summary.allLinkedEntriesPublished
              ? await recordProfitOwedForSeason(
                  {
                    actorUserId: input.actorUserId,
                    seasonId: input.seasonId,
                    tenantId: input.tenantId,
                  },
                  tx
                )
              : { created: 0, total: 0 }

            await tx.auditLog.create({
              data: {
                action: "business.profit_season.shared",
                actorType: "user",
                actorUserId: input.actorUserId,
                entityId: input.seasonId,
                entityType: "DividendPeriod",
                metadata: {
                  memberCount: summary.periodAllocationCount,
                  note: input.note?.trim().slice(0, 500) || null,
                  owedPostingCount: owed.created,
                  profitEntryIds: ids,
                  publishedAllocationCount: published.count,
                  seasonShared: summary.allLinkedEntriesPublished,
                  total: summary.periodAllocationTotal,
                },
                occurredAt: new Date(),
                tenantId: input.tenantId,
              },
            })

            return {
              id: input.seasonId,
              state: summary.allLinkedEntriesPublished
                ? "published"
                : "approved",
            }
          },
          { maxWait: 5_000, timeout: 20_000 }
        ),
    },
    prisma
  )
}
