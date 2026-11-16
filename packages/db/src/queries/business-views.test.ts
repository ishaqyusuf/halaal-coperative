import { describe, expect, test } from "bun:test"
import { closeProfitSeason, shareProfitSeason } from "./business-views"

const tenantId = "10000000-0000-4000-8000-000000000001"
const seasonId = "20000000-0000-4000-8000-000000000001"

function mockPrisma(tx: Record<string, unknown>) {
  const audits: string[] = []

  return {
    audits,
    prisma: {
      $transaction: async (run: (client: unknown) => unknown) => run(tx),
      auditLog: {
        create: async ({ data }: { data: { action: string } }) => {
          audits.push(data.action)
        },
        deleteMany: async () => ({ count: 1 }),
        update: async ({ data }: { data: { action: string } }) => {
          audits.push(data.action)
        },
      },
      tenant: {
        findUnique: async () => ({
          initialMigrationStatus: "live_operations",
          migrationEmergencyUnlockUntil: null,
        }),
      },
    } as never,
  }
}

const command = {
  actorUserId: "30000000-0000-4000-8000-000000000001",
  seasonId,
  tenantId,
}

describe("closeProfitSeason", () => {
  test("closes an open season once and fixes its totals", async () => {
    const updates: unknown[] = []
    const postings: Array<{ idempotencyKey: string; postedAt: Date }> = []
    const lines: Array<{ amount: number; direction: string; ledgerAccountId: string }> = []
    const recognitionWheres: unknown[] = []
    const profitDate = new Date("2026-07-31T00:00:00.000Z")
    const { prisma } = mockPrisma({
      auditLog: { create: async () => ({}) },
      dividendPeriod: {
        updateMany: async (args: unknown) => {
          updates.push(args)
          return { count: 1 }
        },
      },
      ledgerAccount: {
        createMany: async () => ({ count: 1 }),
        findMany: async () => [
          { code: "2000", id: "acct-2000" },
          { code: "3400", id: "acct-3400" },
        ],
      },
      ledgerEntry: {
        createMany: async ({ data }: { data: typeof lines }) => {
          lines.push(...data)
          return { count: data.length }
        },
      },
      ledgerTransaction: {
        createMany: async ({ data }: { data: typeof postings }) => {
          postings.push(...data)
          return { count: data.length }
        },
        findMany: async () => [{ idempotencyKey: "business-profit:e2" }],
      },
      shareBusinessProfitEntry: {
        findMany: async (args: { where: { shareBusiness?: unknown } }) => {
          if (args.where.shareBusiness) recognitionWheres.push(args.where)
          return [
            { allocatableProfitAmount: 90, expenseAmount: 10, id: "e1", profitAmount: 100, profitDate, shareBusiness: { name: "Farm" } },
            { allocatableProfitAmount: 50, expenseAmount: 0, id: "e2", profitAmount: 50, profitDate, shareBusiness: { name: "Shop" } },
          ]
        },
        updateMany: async () => ({ count: 2 }),
      },
    })

    const result = await closeProfitSeason(
      { ...command, commandId: crypto.randomUUID() },
      prisma
    )

    expect(result.state).toBe("approved")
    expect(updates[0]).toMatchObject({
      data: { distributableAmount: 140, status: "approved", totalProfitAmount: 150 },
      where: { id: seasonId, status: "draft", tenantId },
    })
    // Profit comes into the books once per entry (e2 already did), never
    // for Halaalvest's own purchases business or brought-in history.
    expect(recognitionWheres[0]).toMatchObject({
      shareBusiness: { systemKey: null },
      sourceType: "manual",
    })
    expect(postings).toEqual([
      expect.objectContaining({
        idempotencyKey: "business-profit:e1",
        postedAt: profitDate,
      }),
    ])
    expect(lines).toEqual([
      expect.objectContaining({ amount: 90, direction: "debit", ledgerAccountId: "acct-2000" }),
      expect.objectContaining({ amount: 90, direction: "credit", ledgerAccountId: "acct-3400" }),
    ])
  })

  test("refuses a season that is no longer open", async () => {
    const { prisma } = mockPrisma({
      dividendPeriod: { updateMany: async () => ({ count: 0 }) },
      shareBusinessProfitEntry: {
        findMany: async () => [
          { allocatableProfitAmount: 90, expenseAmount: 0, id: "e1", profitAmount: 90 },
        ],
      },
    })

    await expect(
      closeProfitSeason({ ...command, commandId: crypto.randomUUID() }, prisma)
    ).rejects.toThrow("already closed")
  })
})

describe("shareProfitSeason", () => {
  test("refuses a season that was already shared", async () => {
    const { prisma } = mockPrisma({
      dividendPeriod: { findFirst: async () => ({ status: "published" }) },
    })

    await expect(
      shareProfitSeason({ ...command, commandId: crypto.randomUUID() }, prisma)
    ).rejects.toThrow("already been shared")
  })

  test("refuses to share before every member share is worked out", async () => {
    const { prisma } = mockPrisma({
      dividendPeriod: { findFirst: async () => ({ status: "approved" }) },
      shareBusinessProfitEntry: {
        findMany: async () => [
          {
            allocatableProfitAmount: 100,
            allocations: [{ allocatedProfitAmount: 60, status: "draft" }],
            id: "e1",
            status: "reviewed",
          },
        ],
      },
    })

    await expect(
      shareProfitSeason({ ...command, commandId: crypto.randomUUID() }, prisma)
    ).rejects.toThrow("Work out members' shares before sharing.")
  })

  test("publishes every worked-out profit in one go", async () => {
    const published: unknown[] = []
    const { prisma } = mockPrisma({
      auditLog: { create: async () => ({}) },
      dividendAllocation: {
        createMany: async () => ({ count: 1 }),
        deleteMany: async () => ({ count: 0 }),
      },
      dividendPeriod: {
        findFirst: async () => ({ status: "approved" }),
        update: async () => ({}),
      },
      shareBusinessProfitEntry: {
        findMany: async (args: { include?: unknown }) =>
          args.include
            ? [
                {
                  allocations: [
                    {
                      allocatedProfitAmount: 100,
                      memberId: "m1",
                      memberShareBalance: 1000,
                      status: "published",
                    },
                  ],
                  id: "e1",
                },
              ]
            : [
                {
                  allocatableProfitAmount: 100,
                  allocations: [{ allocatedProfitAmount: 100, status: "draft" }],
                  id: "e1",
                  status: "reviewed",
                },
              ],
        updateMany: async () => ({ count: 1 }),
      },
      shareProfitAllocation: {
        updateMany: async (args: unknown) => {
          published.push(args)
          return { count: 1 }
        },
      },
    })

    const result = await shareProfitSeason(
      { ...command, commandId: crypto.randomUUID() },
      prisma
    )

    expect(result.state).toBe("published")
    expect(published[0]).toMatchObject({
      data: { status: "published" },
      where: { profitEntryId: { in: ["e1"] }, status: "draft" },
    })
  })

  test("records each member's share as owed once the season is shared", async () => {
    let status = "approved"
    const transactions: Array<{ idempotencyKey: string; memberId: string }> = []
    const entries: Array<{ amount: number; direction: string; ledgerAccountId: string }> = []
    const { prisma } = mockPrisma({
      auditLog: { create: async () => ({}) },
      dividendAllocation: {
        createMany: async () => ({ count: 2 }),
        deleteMany: async () => ({ count: 0 }),
        findMany: async () => [
          { allocationAmount: 70, memberId: "m1" },
          { allocationAmount: 30, memberId: "m2" },
        ],
      },
      dividendPeriod: {
        findFirst: async () => ({ name: "2026 Mid-year", status }),
        update: async () => {
          status = "published"
          return {}
        },
      },
      ledgerAccount: {
        createMany: async () => ({ count: 0 }),
        findMany: async () =>
          ["1000", "2000", "2300", "4000"].map((code) => ({ code, id: `acct-${code}` })),
      },
      ledgerEntry: {
        createMany: async ({ data }: { data: typeof entries }) => {
          entries.push(...data)
          return { count: data.length }
        },
      },
      ledgerTransaction: {
        createMany: async ({ data }: { data: typeof transactions }) => {
          transactions.push(...data)
          return { count: data.length }
        },
        findMany: async () => [],
      },
      shareBusinessProfitEntry: {
        count: async () => 1,
        findMany: async (args: { include?: unknown; where?: { shareBusiness?: unknown } }) =>
          args.where?.shareBusiness
            ? [] // profit already in the books (covered by closeProfitSeason)
            : args.include
            ? [
                {
                  allocations: [
                    { allocatedProfitAmount: 70, memberId: "m1", memberShareBalance: 700, status: "published" },
                    { allocatedProfitAmount: 30, memberId: "m2", memberShareBalance: 300, status: "published" },
                  ],
                  id: "e1",
                },
              ]
            : [
                {
                  allocatableProfitAmount: 100,
                  allocations: [
                    { allocatedProfitAmount: 70, status: "draft" },
                    { allocatedProfitAmount: 30, status: "draft" },
                  ],
                  id: "e1",
                  status: "reviewed",
                },
              ],
        updateMany: async () => ({ count: 1 }),
      },
      shareProfitAllocation: { updateMany: async () => ({ count: 2 }) },
    })

    await shareProfitSeason({ ...command, commandId: crypto.randomUUID() }, prisma)

    expect(transactions.map((row) => row.idempotencyKey)).toEqual([
      `profit-owed:${seasonId}:m1`,
      `profit-owed:${seasonId}:m2`,
    ])
    expect(entries).toEqual([
      expect.objectContaining({ amount: 70, direction: "debit", ledgerAccountId: "acct-4000" }),
      expect.objectContaining({ amount: 70, direction: "credit", ledgerAccountId: "acct-2300" }),
      expect.objectContaining({ amount: 30, direction: "debit", ledgerAccountId: "acct-4000" }),
      expect.objectContaining({ amount: 30, direction: "credit", ledgerAccountId: "acct-2300" }),
    ])
  })

  test("keeps an optional approval note on the shared record", async () => {
    const audits: Array<{ metadata: { note: string | null } }> = []
    const { prisma } = mockPrisma({
      auditLog: {
        create: async ({ data }: { data: (typeof audits)[number] }) => {
          audits.push(data)
          return {}
        },
      },
      dividendAllocation: {
        createMany: async () => ({ count: 1 }),
        deleteMany: async () => ({ count: 0 }),
      },
      dividendPeriod: {
        findFirst: async () => ({ status: "approved" }),
        update: async () => ({}),
      },
      shareBusinessProfitEntry: {
        findMany: async (args: { include?: unknown }) =>
          args.include
            ? [{ allocations: [], id: "e1" }]
            : [
                {
                  allocatableProfitAmount: 100,
                  allocations: [{ allocatedProfitAmount: 100, status: "draft" }],
                  id: "e1",
                  status: "reviewed",
                },
              ],
        updateMany: async () => ({ count: 1 }),
      },
      shareProfitAllocation: { updateMany: async () => ({ count: 1 }) },
    })

    await shareProfitSeason(
      {
        ...command,
        commandId: crypto.randomUUID(),
        note: "  Approved at the March board meeting  ",
      },
      prisma
    )

    expect(audits[0]?.metadata.note).toBe(
      "Approved at the March board meeting"
    )
  })
})
