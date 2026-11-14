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
    const { prisma } = mockPrisma({
      auditLog: { create: async () => ({}) },
      dividendPeriod: {
        updateMany: async (args: unknown) => {
          updates.push(args)
          return { count: 1 }
        },
      },
      shareBusinessProfitEntry: {
        findMany: async () => [
          { allocatableProfitAmount: 90, expenseAmount: 10, id: "e1", profitAmount: 100 },
          { allocatableProfitAmount: 50, expenseAmount: 0, id: "e2", profitAmount: 50 },
        ],
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
})
