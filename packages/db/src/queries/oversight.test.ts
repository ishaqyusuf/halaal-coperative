import { describe, expect, it } from "bun:test"
import {
  oversightBusinesses,
  oversightSummary,
  oversightUsers,
} from "./oversight"

type Call = { model: string; method: string; args: any }

function fakeDb(data: {
  counts?: number[]
  tenants?: any[]
  users?: any[]
  periodUsers?: { createdAt: Date }[]
  memberships?: { tenantId: string; userId: string }[]
}) {
  const calls: Call[] = []
  const counts = [...(data.counts ?? [])]
  let userFindMany = 0
  const db = {
    tenant: {
      count: async (args: any) => {
        calls.push({ model: "tenant", method: "count", args })
        return counts.shift() ?? 0
      },
      findMany: async (args: any) => {
        calls.push({ model: "tenant", method: "findMany", args })
        return data.tenants ?? []
      },
    },
    user: {
      count: async (args: any) => {
        calls.push({ model: "user", method: "count", args })
        return counts.shift() ?? 0
      },
      findMany: async (args: any) => {
        calls.push({ model: "user", method: "findMany", args })
        userFindMany++
        return args.select.fullName ? (data.users ?? []) : (data.periodUsers ?? [])
      },
    },
    membership: {
      findMany: async (args: any) => {
        calls.push({ model: "membership", method: "findMany", args })
        return data.memberships ?? []
      },
    },
  }
  return { db: db as any, calls, userFindMany: () => userFindMany }
}

describe("oversight summary", () => {
  it("reports halaalvest totals with no orders and a UTC daily user series", async () => {
    const { db, calls } = fakeDb({
      counts: [4, 3, 20, 2, 1],
      periodUsers: [
        { createdAt: new Date("2026-11-18T09:00:00Z") },
        { createdAt: new Date("2026-11-18T23:59:00Z") },
      ],
    })
    const result = await oversightSummary(
      db,
      7,
      new Date("2026-11-18T12:00:00Z")
    )
    expect(result.projectId).toBe("halaalvest")
    expect(result.period.from).toBe("2026-11-12T00:00:00.000Z")
    expect(result.totals).toEqual({
      businesses: 4,
      activeBusinesses: 3,
      users: 20,
      newUsers: 2,
      orders: 0,
      newBusinesses: 1,
    })
    expect(result.series).toHaveLength(7)
    expect(result.series.at(-1)).toEqual({
      date: "2026-11-18",
      orders: 0,
      users: 2,
    })
    const tenantWhere = calls.find((c) => c.model === "tenant")?.args.where
    expect(tenantWhere).toMatchObject({
      dataClassification: "live",
      qaPurgeStartedAt: null,
      status: { not: "archived" },
    })
  })

  it("refuses a series beyond the supported volume", async () => {
    const { db } = fakeDb({
      periodUsers: Array.from({ length: 10_001 }, () => ({
        createdAt: new Date(),
      })),
    })
    await expect(oversightSummary(db, 90)).rejects.toThrow("volume")
  })
})

describe("oversight directories", () => {
  it("lists live cooperatives, counting each person once", async () => {
    const created = new Date("2026-01-01T00:00:00Z")
    const tenants = Array.from({ length: 51 }, (_, i) => ({
      id: `t${i}`,
      name: `Coop ${i}`,
      slug: `coop-${i}`,
      status: i === 0 ? "active" : i === 1 ? "pending" : "suspended",
      createdAt: created,
      updatedAt: created,
    }))
    const { db } = fakeDb({
      tenants,
      memberships: [
        { tenantId: "t0", userId: "u1" },
        { tenantId: "t0", userId: "u2" },
      ],
    })
    const result = await oversightBusinesses(db, "", undefined)
    expect(result.items).toHaveLength(50)
    expect(result.nextCursor).toBe("t49")
    expect(result.items[0]).toMatchObject({
      status: "active",
      type: "Cooperative",
      users: 2,
      orders: 0,
    })
    expect(result.items[1]?.status).toBe("pending")
    expect(result.items[2]?.status).toBe("suspended")
  })

  it("lists accounts with their live cooperative count", async () => {
    const { db, calls } = fakeDb({
      users: [
        {
          id: "u1",
          fullName: "Ada",
          email: "ada@example.com",
          createdAt: new Date("2026-02-01T00:00:00Z"),
        },
      ],
      memberships: [
        { tenantId: "t1", userId: "u1" },
        { tenantId: "t2", userId: "u1" },
      ],
    })
    const result = await oversightUsers(db, "ada", undefined)
    expect(result).toEqual({
      items: [
        {
          id: "u1",
          name: "Ada",
          email: "ada@example.com",
          createdAt: "2026-02-01T00:00:00.000Z",
          businesses: 2,
        },
      ],
      nextCursor: null,
    })
    const where = calls.find((c) => c.model === "user")?.args.where
    expect(JSON.stringify(where)).toContain("insensitive")
  })
})
