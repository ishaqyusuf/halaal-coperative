import type { PrismaClient } from "../../generated/prisma/client"

/**
 * Oversight portfolio reads (contract v1). Only live cooperatives count:
 * QA cooperatives and ones being purged stay out, as do archived ones.
 * Halaalvest has no commercial orders, so `orders` is always 0 and Oversight
 * hides it for this project.
 */
type Db = Pick<PrismaClient, "membership" | "tenant" | "user">

const PAGE = 50
const SERIES_LIMIT = 10_000

const liveTenant = {
  dataClassification: "live" as const,
  qaPurgeStartedAt: null,
  status: { not: "archived" as const },
}

// Platform accounts with no cooperative, or members of a live cooperative.
const liveAccounts = {
  deletedAt: null,
  OR: [
    { memberships: { none: {} } },
    { memberships: { some: { tenant: liveTenant } } },
  ],
}

export const oversightPeriods = [7, 30, 90] as const
export type OversightPeriod = (typeof oversightPeriods)[number]

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function oversightSummary(
  db: Db,
  days: OversightPeriod,
  now = new Date()
) {
  const to = now
  const from = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate() - days + 1)
  )
  const inPeriod = { gte: from, lte: to }
  const [
    businesses,
    activeBusinesses,
    users,
    newUsers,
    newBusinesses,
    usersInPeriod,
  ] = await Promise.all([
    db.tenant.count({ where: liveTenant }),
    db.tenant.count({ where: { ...liveTenant, status: "active" } }),
    db.user.count({ where: liveAccounts }),
    db.user.count({ where: { ...liveAccounts, createdAt: inPeriod } }),
    db.tenant.count({ where: { ...liveTenant, createdAt: inPeriod } }),
    db.user.findMany({
      where: { ...liveAccounts, createdAt: inPeriod },
      select: { createdAt: true },
      take: SERIES_LIMIT + 1,
    }),
  ])
  if (usersInPeriod.length > SERIES_LIMIT) {
    throw new Error("Oversight series exceeds supported volume")
  }

  const buckets = new Map<
    string,
    { date: string; orders: number; users: number }
  >()
  for (let i = 0; i < days; i++) {
    const date = utcDay(new Date(from.getTime() + i * 86_400_000))
    buckets.set(date, { date, orders: 0, users: 0 })
  }
  for (const user of usersInPeriod) {
    const bucket = buckets.get(utcDay(user.createdAt))
    if (bucket) bucket.users++
  }

  return {
    version: 1 as const,
    projectId: "halaalvest" as const,
    asOf: to.toISOString(),
    period: { from: from.toISOString(), to: to.toISOString() },
    capabilities: { businessStatus: false, campaigns: false },
    totals: {
      businesses,
      activeBusinesses,
      users,
      newUsers,
      orders: 0,
      newBusinesses,
    },
    series: [...buckets.values()],
  }
}

function page<T extends { id: string }>(rows: T[]) {
  return {
    rows: rows.slice(0, PAGE),
    nextCursor: rows.length > PAGE ? (rows[PAGE - 1]?.id ?? null) : null,
  }
}

const insensitive = "insensitive" as const

export async function oversightBusinesses(
  db: Db,
  search: string,
  cursor?: string
) {
  const result = page(
    await db.tenant.findMany({
      where: {
        ...liveTenant,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: insensitive } },
                { slug: { contains: search, mode: insensitive } },
              ],
            }
          : {}),
      },
      orderBy: { id: "asc" },
      take: PAGE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  )

  // A person can hold several roles in one cooperative; count people once.
  const pairs = result.rows.length
    ? await db.membership.findMany({
        where: {
          tenantId: { in: result.rows.map((tenant) => tenant.id) },
          user: { deletedAt: null },
        },
        select: { tenantId: true, userId: true },
        distinct: ["tenantId", "userId"],
      })
    : []
  const people = new Map<string, number>()
  for (const pair of pairs) {
    people.set(pair.tenantId, (people.get(pair.tenantId) ?? 0) + 1)
  }

  return {
    items: result.rows.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status:
        tenant.status === "active"
          ? ("active" as const)
          : tenant.status === "pending"
            ? ("pending" as const)
            : ("suspended" as const),
      type: "Cooperative",
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
      users: people.get(tenant.id) ?? 0,
      orders: 0,
    })),
    nextCursor: result.nextCursor,
  }
}

export async function oversightUsers(
  db: Db,
  search: string,
  cursor?: string
) {
  const result = page(
    await db.user.findMany({
      where: {
        AND: [
          liveAccounts,
          ...(search
            ? [
                {
                  OR: [
                    { fullName: { contains: search, mode: insensitive } },
                    { email: { contains: search, mode: insensitive } },
                  ],
                },
              ]
            : []),
        ],
      },
      orderBy: { id: "asc" },
      take: PAGE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, fullName: true, email: true, createdAt: true },
    })
  )

  const pairs = result.rows.length
    ? await db.membership.findMany({
        where: {
          userId: { in: result.rows.map((user) => user.id) },
          tenant: liveTenant,
        },
        select: { tenantId: true, userId: true },
        distinct: ["tenantId", "userId"],
      })
    : []
  const cooperatives = new Map<string, number>()
  for (const pair of pairs) {
    cooperatives.set(pair.userId, (cooperatives.get(pair.userId) ?? 0) + 1)
  }

  return {
    items: result.rows.map((user) => ({
      id: user.id,
      name: user.fullName,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      businesses: cooperatives.get(user.id) ?? 0,
    })),
    nextCursor: result.nextCursor,
  }
}
