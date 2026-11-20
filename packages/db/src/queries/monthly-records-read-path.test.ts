import { describe, expect, test } from "bun:test"
import {
  ensureMonthlyRecord,
  getMonthlyRecordDetail,
  getMonthlyRecordRowsPage,
  getMonthlyRecordsPageData,
  pageMonthlyRecordRows,
  type MonthlyRecordMemberRow,
  type MonthlyRecordRowsQuery,
} from "./monthly-records"

const writeMethods = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "delete",
  "deleteMany",
  "update",
  "updateMany",
  "upsert",
])

// Wraps model delegates so every call is recorded as "model.method".
function recordingPrisma(models: Record<string, Record<string, unknown>>) {
  const calls: string[] = []
  const prisma: Record<string, unknown> = {
    $transaction: async (input: unknown) => {
      calls.push("$transaction")
      return Array.isArray(input) ? Promise.all(input) : input
    },
  }

  for (const [model, methods] of Object.entries(models)) {
    prisma[model] = Object.fromEntries(
      Object.entries(methods).map(([method, fn]) => [
        method,
        (...args: unknown[]) => {
          calls.push(`${model}.${method}`)
          return (fn as (...input: unknown[]) => unknown)(...args)
        },
      ])
    )
  }

  return { calls, prisma }
}

function pageGetPrisma(memberCount: number) {
  const chargeMemberBatches: string[][] = []
  const memberRows = Array.from({ length: memberCount }, (_, index) => ({
    calculatedPayableAmount: 100,
    contributionAmount: 100,
    id: `row-${index}`,
    loanId: null,
    loanRepaymentAmount: 0,
    member: {
      deductionSource: index % 2 === 0 ? { id: "w1", name: "Ministry" } : null,
      fullName: `Member ${index}`,
      id: `member-${index}`,
      memberNumber: `M-${String(index).padStart(3, "0")}`,
      totalSavingsSnapshot: 0,
    },
    memberId: `member-${index}`,
    shareChargeAmount: 0,
    status: index === 0 ? "applied" : "pending",
    totalPaidAmount: 100,
  }))

  const stub = recordingPrisma({
    chargeApplicability: {
      findMany: async () => [
        {
          chargeDefinition: {
            code: "LEVY",
            id: "charge-1",
            name: "Levy",
            versions: [
              {
                amount: 2,
                chargeValueType: "percentage",
                effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
                id: "version-1",
              },
            ],
          },
          collectionMode: "deduct_from_savings",
          id: "applicability-1",
          isRequired: true,
        },
      ],
    },
    chargeApplication: {
      findMany: async (input: { where: { memberId: { in: string[] } } }) => {
        const ids = input.where.memberId.in
        chargeMemberBatches.push(ids)
        return ids.includes("member-0")
          ? [{ memberId: "member-0", chargeDefinitionId: "charge-1", amount: 3.25 }]
          : []
      },
    },
    chargeDefinition: { findMany: async () => [] },
    loan: { findMany: async () => [] },
    monthlyRecord: {
      findFirst: async () => ({
        id: "record-1",
        memberRows,
        periodLabel: "January 2026",
        periodMonth: 1,
        periodYear: 2026,
        status: "open",
      }),
      findMany: async () => [
        {
          id: "record-1",
          periodLabel: "January 2026",
          periodMonth: 1,
          periodYear: 2026,
          status: "open",
        },
      ],
    },
    monthlyRecordMember: {
      groupBy: async () => [
        {
          _count: { _all: 1 },
          _sum: { calculatedPayableAmount: 100, totalPaidAmount: 100 },
          monthlyRecordId: "record-1",
          status: "applied",
        },
        {
          _count: { _all: memberCount - 1 },
          _sum: {
            calculatedPayableAmount: 100 * (memberCount - 1),
            totalPaidAmount: 100 * (memberCount - 1),
          },
          monthlyRecordId: "record-1",
          status: "pending",
        },
      ],
    },
    monthlyRecordSetting: { findUnique: async () => null },
  })
  return { ...stub, chargeMemberBatches }
}

describe("monthly records page GET", () => {
  test("issues no writes and the same queries for 2 or 40 members", async () => {
    const small = pageGetPrisma(2)
    const large = pageGetPrisma(40)

    const smallData = await getMonthlyRecordsPageData(
      { tenantId: "tenant-1" },
      small.prisma as never
    )
    const largeData = await getMonthlyRecordsPageData(
      { tenantId: "tenant-1" },
      large.prisma as never
    )

    expect([...small.calls].sort()).toEqual([...large.calls].sort())
    expect(large.calls.length).toBeLessThanOrEqual(7)
    for (const call of large.calls) {
      const method = call.split(".")[1] ?? call
      expect(writeMethods.has(method) || call === "$transaction").toBe(false)
    }

    expect(largeData.records).toEqual([
      expect.objectContaining({
        id: "record-1",
        pendingCount: 39,
        recordedCount: 1,
        totalMembers: 40,
        totalPayableAmount: 4000,
        totalReceivedAmount: 100,
      }),
    ])
    expect(largeData.settings).toEqual({
      autoGenerateEnabled: true,
      generationDayOfMonth: 1,
    })
    expect(largeData.firstPage.data).toHaveLength(40)
    expect(smallData.firstPage.data).toHaveLength(2)
    expect(largeData.selectedRecord).toMatchObject({
      stats: { paidCount: 1, received: 100, toReceive: 3900, total: 40 },
      workplaces: [
        {
          id: "w1",
          unpaidCount: 19,
          stats: { paidCount: 1, received: 100, toReceive: 1900, total: 20 },
        },
      ],
    })
  })

  test("never loads a detail for a record id outside the tenant's list", async () => {
    const { calls, prisma } = pageGetPrisma(3)

    const data = await getMonthlyRecordsPageData(
      { selectedRecordId: "other-tenant-record", tenantId: "tenant-1" },
      prisma as never
    )

    expect(data.selectedRecord?.id).toBe("record-1")
    expect(calls.filter((call) => call === "monthlyRecord.findFirst")).toHaveLength(1)
  })
  test("enriches only the visible rows for stored sorts, with whole-month totals", async () => {
    const { chargeMemberBatches, prisma } = pageGetPrisma(120)
    const rowsQuery: MonthlyRecordRowsQuery = {
      workplaceId: "w1",
      pageSize: 10,
      sort: ["totalPayableAmount", "asc"],
    }
    const first = await getMonthlyRecordsPageData(
      { rowsQuery, tenantId: "tenant-1" },
      prisma as never
    )
    const next = await getMonthlyRecordRowsPage(
      "tenant-1",
      "record-1",
      { ...rowsQuery, cursor: first.firstPage.meta.cursor },
      prisma as never
    )

    expect(first.selectedRecord?.stats.total).toBe(120)
    expect(first.selectedRecord?.workplaces[0]?.stats.total).toBe(60)
    expect(first.firstPage.meta).toEqual({ cursor: "row-18", total: 60 })
    expect(first.firstPage.data[0]).toMatchObject({
      allChargesAmount: 3.25,
      calculatedChargesAmount: 2,
      finalIncomeAmount: 96.75,
      hasChargeDifference: true,
    })
    expect(next.data.map(({ id }) => id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `row-${20 + index * 2}`)
    )
    expect(chargeMemberBatches.map(({ length }) => length)).toEqual([10, 10])
  })

  test("orders calculated values across the full result before cutting pages", async () => {
    const { prisma } = pageGetPrisma(12)
    const detail = await getMonthlyRecordDetail("tenant-1", "record-1", prisma as never)
    expect(detail?.totalChargeAmount).toBe(24)
    const query: MonthlyRecordRowsQuery = {
      pageSize: 2,
      sort: ["finalIncomeAmount", "desc"],
    }
    const first = await getMonthlyRecordRowsPage(
      "tenant-1", "record-1", query, prisma as never
    )
    const nextQuery = { ...query, cursor: first.meta.cursor }
    expect(first.data.map(({ id }) => id)).toEqual(["row-1", "row-2"])
    expect(await getMonthlyRecordRowsPage("tenant-1", "record-1", nextQuery, prisma as never))
      .toEqual(pageMonthlyRecordRows(detail?.rows ?? [], nextQuery))
    expect(await getMonthlyRecordRowsPage("tenant-1", "record-1", {
      ...nextQuery, cursor: "missing",
    }, prisma as never)).toEqual(first)
  })

})

describe("monthly record seeding", () => {
  test("creates missing rows in one batch and refreshes only changed pending rows", async () => {
    const createManyInputs: Array<{ data: Array<{ memberId: string }> }> = []
    const updateManyInputs: Array<{ where: { id: string; status: string } }> = []
    const member = (id: string, amount: number) => ({
      contributionPlans: [{ amount, id: `plan-${id}` }],
      id,
      loans: [],
    })
    const existingRow = (memberId: string, status: string, amount: number) => ({
      calculatedPayableAmount: amount,
      contributionAmount: amount,
      contributionPlanId: `plan-${memberId}`,
      id: `row-${memberId}`,
      loanId: null,
      loanRepaymentAmount: 0,
      memberId,
      shareChargeAmount: 0,
      status,
      totalPaidAmount: amount,
    })
    const { calls, prisma } = recordingPrisma({
      // Models the live-writes gate (initial migration state) reads.
      appliedBackfillMonth: { findMany: async () => [] },
      auditLog: { count: async () => 0 },
      backfillBatch: { count: async () => 0, findMany: async () => [] },
      chargeDefinitionVersion: { count: async () => 1 },
      legacyLoanMigrationDraft: { count: async () => 0 },
      loan: { count: async () => 0 },
      shareBusinessProfitEntry: { count: async () => 1 },
      tenantShareStructureVersion: { count: async () => 1 },
      chargeDefinition: {
        findFirst: async () => null,
        findMany: async () => [],
      },
      member: {
        // Only the seed lookup includes plans; the gate's lookup gets none.
        findMany: async (input: { include?: unknown }) =>
          input.include
            ? [
                member("new", 100),
                member("stale", 200),
                member("same", 300),
                member("applied", 400),
              ]
            : [],
      },
      monthlyRecord: { upsert: async () => ({ id: "record-1" }) },
      monthlyRecordMember: {
        createMany: async (input: (typeof createManyInputs)[number]) => {
          createManyInputs.push(input)
          return { count: input.data.length }
        },
        findMany: async () => [
          existingRow("stale", "pending", 150),
          existingRow("same", "pending", 300),
          existingRow("applied", "applied", 999),
        ],
        updateMany: async (input: (typeof updateManyInputs)[number]) => {
          updateManyInputs.push(input)
          return { count: 1 }
        },
      },
      tenant: {
        findUnique: async () => ({
          id: "tenant-1",
          initialMigrationStatus: "live_operations",
          migrationEmergencyUnlockUntil: null,
          migrationFinalizedAt: new Date("2025-02-01T00:00:00.000Z"),
          startDate: new Date("2025-01-01T00:00:00.000Z"),
        }),
      },
    })

    await ensureMonthlyRecord(
      { actorUserId: "user-1", month: 1, tenantId: "tenant-1", year: 2026 },
      prisma as never
    )

    expect(createManyInputs).toHaveLength(1)
    expect(createManyInputs[0]).toMatchObject({ skipDuplicates: true })
    expect(createManyInputs[0]?.data.map((row) => row.memberId)).toEqual(["new"])
    expect(updateManyInputs.map((input) => input.where)).toEqual([
      { id: "row-stale", status: "pending" },
    ])
    expect(calls.filter((call) => call.startsWith("monthlyRecordMember."))).toEqual([
      "monthlyRecordMember.findMany",
      "monthlyRecordMember.createMany",
      "monthlyRecordMember.updateMany",
    ])
  })
})

describe("monthly record row paging", () => {
  const row = (
    id: string,
    memberName: string,
    status: MonthlyRecordMemberRow["status"],
    totalPaidAmount: number
  ) =>
    ({
      id,
      memberName,
      memberNumber: id.toUpperCase(),
      status,
      totalPaidAmount,
    }) as MonthlyRecordMemberRow
  const rows = [
    row("a", "Aisha", "pending", 300),
    row("b", "Bilal", "applied", 100),
    row("c", "Chidi", "pending", 200),
  ]

  test("filters by search and status, sorts, and pages with a cursor", () => {
    expect(pageMonthlyRecordRows(rows, { q: "bil" }).data.map((r) => r.id)).toEqual(["b"])
    expect(pageMonthlyRecordRows(rows, { q: "C" }).data.map((r) => r.id)).toEqual(["c"])
    expect(
      pageMonthlyRecordRows(rows, { status: "pending" }).data.map((r) => r.id)
    ).toEqual(["a", "c"])

    const first = pageMonthlyRecordRows(rows, {
      pageSize: 2,
      sort: ["totalPaidAmount", "asc"],
    })
    expect(first.data.map((r) => r.id)).toEqual(["b", "c"])
    expect(first.meta).toEqual({ cursor: "c", total: 3 })

    const second = pageMonthlyRecordRows(rows, {
      cursor: first.meta.cursor,
      pageSize: 2,
      sort: ["totalPaidAmount", "asc"],
    })
    expect(second.data.map((r) => r.id)).toEqual(["a"])
    expect(second.meta.cursor).toBeUndefined()
  })
})
