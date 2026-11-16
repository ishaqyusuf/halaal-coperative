import { describe, expect, test } from "bun:test"
import {
  payOutProfit,
  profitOwedIdempotencyKey,
  recordProfitOwedForSeason,
  reverseProfitPayout,
} from "./profit-payouts"

/**
 * An in-memory stand-in for the tables profit payout touches. It enforces the
 * two unique keys that make payouts safe (ledger idempotency key, one payout
 * per season and member) and rolls a transaction back when it throws.
 */
const tenantId = "10000000-0000-4000-8000-000000000001"
const seasonId = "20000000-0000-4000-8000-000000000001"
const actorUserId = "30000000-0000-4000-8000-000000000001"
const aisha = "40000000-0000-4000-8000-000000000001"
const bilal = "40000000-0000-4000-8000-000000000002"
const zero = "40000000-0000-4000-8000-000000000003"

type Row = Record<string, any>

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, condition]) => {
    const value = row[key]
    if (
      condition &&
      typeof condition === "object" &&
      !Array.isArray(condition)
    ) {
      if ("in" in condition) return condition.in.includes(value)
      if ("notIn" in condition) return !condition.notIn.includes(value)
      if ("not" in condition) return value !== condition.not
      return matches(value ?? {}, condition)
    }
    return value === condition
  })
}

function uniqueError() {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
}

function createDb(
  options: { goLive?: Date; liveProfit?: boolean; seasonStatus?: string } = {}
) {
  let state = {
    auditLogs: [] as Row[],
    contributions: [] as Row[],
    dividendAllocations: [
      {
        allocationAmount: 600,
        dividendPeriodId: seasonId,
        memberId: aisha,
        tenantId,
      },
      {
        allocationAmount: 400,
        dividendPeriodId: seasonId,
        memberId: bilal,
        tenantId,
      },
      {
        allocationAmount: 0,
        dividendPeriodId: seasonId,
        memberId: zero,
        tenantId,
      },
    ] as Row[],
    ledgerAccounts: ["1000", "2000", "4000"].map((code) => ({
      code,
      id: `acct-${code}`,
      tenantId,
    })) as Row[],
    ledgerEntries: [] as Row[],
    ledgerTransactions: [] as Row[],
    members: {
      [aisha]: { fullName: "Aisha Bello", snapshot: 0 },
      [bilal]: { fullName: "Bilal Musa", snapshot: 0 },
      [zero]: { fullName: "Zainab Umar", snapshot: 0 },
    } as Record<string, { fullName: string; snapshot: number }>,
    payouts: [] as Row[],
    withdrawals: {} as Record<string, number>,
  }
  const period = {
    id: seasonId,
    name: "2026 Mid-year",
    publishedAt: new Date("2026-07-01T00:00:00.000Z"),
    status: options.seasonStatus ?? "published",
  }
  // One ordinary business's profit (₦1,100 made, ₦100 costs) and the
  // automatic "Procurement and foodstuff sales" entry, whose profit is
  // already in Purchase Profit (3300).
  const profitEntries: Row[] = [
    {
      allocatableProfitAmount: 1000,
      expenseAmount: 100,
      id: "entry-logistics",
      linkedDividendPeriodId: seasonId,
      profitAmount: 1100,
      profitDate: new Date("2026-07-31T00:00:00.000Z"),
      shareBusiness: { name: "Logistics Service", systemKey: null },
      sourceType: options.liveProfit === false ? "backfill" : "manual",
      status: "completed",
      tenantId,
    },
    {
      allocatableProfitAmount: 250,
      expenseAmount: 0,
      id: "entry-purchases",
      linkedDividendPeriodId: seasonId,
      profitAmount: 250,
      profitDate: new Date("2026-08-15T00:00:00.000Z"),
      shareBusiness: {
        name: "Procurement and foodstuff sales",
        systemKey: "member_purchase_sales",
      },
      sourceType: "manual",
      status: "completed",
      tenantId,
    },
  ]
  const memberOf = (memberId: string) => ({
    fullName: state.members[memberId]?.fullName,
  })

  const client: any = {
    $executeRaw: async (
      _strings: TemplateStringsArray,
      ...values: unknown[]
    ) => {
      const json = values.find(
        (value) => typeof value === "string" && value.startsWith("[")
      ) as string
      for (const row of JSON.parse(json) as Array<{
        amount: number
        id: string
      }>) {
        state.members[row.id]!.snapshot += row.amount
      }
      return 1
    },
    $queryRaw: async (_strings: TemplateStringsArray, ...values: unknown[]) => {
      const memberId = values[1] as string
      const extra = state.contributions
        .filter((row) => row.memberId === memberId && row.status === "posted")
        .reduce((total, row) => total + Number(row.extraSavingsAmount), 0)
      return [{ balance: String(extra - (state.withdrawals[memberId] ?? 0)) }]
    },
    $transaction: async (run: (tx: unknown) => unknown) => {
      const saved = structuredClone(state)
      try {
        return await run(client)
      } catch (error) {
        state = saved
        throw error
      }
    },
    auditLog: {
      create: async ({ data }: { data: Row }) => {
        if (data.id && state.auditLogs.some((row) => row.id === data.id)) {
          throw uniqueError()
        }
        state.auditLogs.push({ ...data })
        return data
      },
      createMany: async ({ data }: { data: Row[] }) => {
        state.auditLogs.push(...data)
        return { count: data.length }
      },
      deleteMany: async ({ where }: { where: Row }) => {
        state.auditLogs = state.auditLogs.filter((row) => !matches(row, where))
        return { count: 1 }
      },
      findFirst: async ({ where }: { where: Row }) =>
        state.auditLogs.find((row) => row.id === where.id) ?? null,
      update: async ({ data, where }: { data: Row; where: Row }) => {
        const row = state.auditLogs.find((item) => item.id === where.id)
        Object.assign(row ?? {}, data)
        return row
      },
    },
    contribution: {
      createMany: async ({ data }: { data: Row[] }) => {
        state.contributions.push(...data.map((row) => ({ ...row })))
        return { count: data.length }
      },
      updateMany: async ({ data, where }: { data: Row; where: Row }) => {
        const rows = state.contributions.filter((row) => matches(row, where))
        for (const row of rows) Object.assign(row, data)
        return { count: rows.length }
      },
    },
    dividendAllocation: {
      findMany: async ({ where }: { where: Row }) =>
        state.dividendAllocations
          .filter((row) => matches(row, where))
          .map((row) => ({ ...row, member: memberOf(row.memberId) })),
    },
    dividendPeriod: {
      findFirst: async () => ({ ...period }),
    },
    ledgerAccount: {
      createMany: async ({ data }: { data: Row[] }) => {
        for (const row of data) {
          if (!state.ledgerAccounts.some((item) => item.code === row.code)) {
            state.ledgerAccounts.push({ ...row, id: `acct-${row.code}` })
          }
        }
        return { count: data.length }
      },
      findMany: async ({ where }: { where: Row }) =>
        state.ledgerAccounts.filter((row) => matches(row, where)),
    },
    ledgerEntry: {
      createMany: async ({ data }: { data: Row[] }) => {
        state.ledgerEntries.push(...data)
        return { count: data.length }
      },
    },
    ledgerTransaction: {
      create: async ({ data }: { data: Row }) => {
        const { entries, ...transaction } = data
        await client.ledgerTransaction.createMany({ data: [transaction] })
        state.ledgerEntries.push(
          ...entries.create.map((entry: Row) => ({
            ...entry,
            ledgerTransactionId: transaction.id,
          }))
        )
        return transaction
      },
      createMany: async ({ data }: { data: Row[] }) => {
        for (const row of data) {
          if (
            state.ledgerTransactions.some(
              (item) => item.idempotencyKey === row.idempotencyKey
            )
          ) {
            throw uniqueError()
          }
          state.ledgerTransactions.push({ ...row })
        }
        return { count: data.length }
      },
      findMany: async ({ where }: { where: Row }) =>
        state.ledgerTransactions.filter((row) => matches(row, where)),
    },
    member: {
      update: async ({ data, where }: { data: Row; where: Row }) => {
        state.members[where.id]!.snapshot -= data.totalSavingsSnapshot.decrement
      },
    },
    profitPayout: {
      createMany: async ({ data }: { data: Row[] }) => {
        for (const row of data) {
          if (
            state.payouts.some(
              (item) =>
                item.dividendPeriodId === row.dividendPeriodId &&
                item.memberId === row.memberId
            )
          ) {
            throw uniqueError()
          }
          state.payouts.push({ ...row })
        }
        return { count: data.length }
      },
      findFirst: async ({ where }: { where: Row }) => {
        const row = state.payouts.find((item) => matches(item, where))
        return row
          ? {
              ...row,
              dividendPeriod: { name: period.name },
              member: memberOf(row.memberId),
            }
          : null
      },
      findMany: async ({ where }: { where: Row }) =>
        state.payouts
          .filter((row) => matches(row, where))
          .map((row) => ({ ...row })),
      updateMany: async ({ data, where }: { data: Row; where: Row }) => {
        const rows = state.payouts.filter((row) => matches(row, where))
        for (const row of rows) Object.assign(row, data)
        return { count: rows.length }
      },
    },
    shareBusinessProfitEntry: {
      count: async () => (options.liveProfit === false ? 0 : 1),
      findMany: async ({ where }: { where: Row }) =>
        profitEntries.filter((row) => matches(row, where)),
    },
    tenant: {
      findUnique: async () => ({
        initialMigrationStatus: "live_operations",
        migrationEmergencyUnlockUntil: null,
        migrationFinalizedAt:
          options.goLive ?? new Date("2026-07-01T09:30:00.000Z"),
      }),
    },
  }

  /** Account balance as debits minus credits. */
  const balance = (code: string) =>
    state.ledgerEntries
      .filter((entry) => entry.ledgerAccountId === `acct-${code}`)
      .reduce(
        (total, entry) =>
          total + (entry.direction === "debit" ? entry.amount : -entry.amount),
        0
      )

  return {
    balance,
    get state() {
      return state
    },
    prisma: client as never,
  }
}

const pay = (overrides: Partial<Parameters<typeof payOutProfit>[0]> = {}) => ({
  actorUserId,
  commandId: crypto.randomUUID(),
  destination: "savings" as const,
  seasonId,
  tenantId,
  ...overrides,
})

describe("profit owed on approval", () => {
  test("records one payable per member with a share, once", async () => {
    const db = createDb()

    const first = await recordProfitOwedForSeason(
      { actorUserId, seasonId, tenantId },
      db.prisma
    )
    const second = await recordProfitOwedForSeason(
      { actorUserId, seasonId, tenantId },
      db.prisma
    )

    expect(first).toEqual({ created: 2, total: 1000 })
    expect(second).toEqual({ created: 0, total: 0 })
    expect(
      db.state.ledgerTransactions
        .map((row) => row.idempotencyKey)
        .filter((key) => key.startsWith("profit-owed:"))
    ).toEqual([
      profitOwedIdempotencyKey(seasonId, aisha),
      profitOwedIdempotencyKey(seasonId, bilal),
    ])
    // Dr Cooperative Equity / Cr Profit Owed To Members.
    expect(db.balance("4000")).toBe(1000)
    // The ordinary business's profit came into the books once, at its profit
    // date; the automatic purchases entry did not (it is already in 3300).
    expect(db.balance("2000")).toBe(1000)
    expect(db.balance("3400")).toBe(-1000)
    expect(
      db.state.ledgerTransactions.find(
        (row) => row.idempotencyKey === "business-profit:entry-logistics"
      )
    ).toMatchObject({
      narration: "Profit to share from Logistics Service",
      postedAt: new Date("2026-07-31T00:00:00.000Z"),
    })
    expect(
      db.state.ledgerTransactions.some(
        (row) => row.idempotencyKey === "business-profit:entry-purchases"
      )
    ).toBe(false)
    expect(db.balance("2300")).toBe(-1000)
    expect(db.state.ledgerAccounts.some((row) => row.code === "2300")).toBe(
      true
    )
  })

  test("does not post profit dated before go-live (it is in the opening cash)", async () => {
    const db = createDb({ goLive: new Date("2026-08-10T00:00:00.000Z") })

    await recordProfitOwedForSeason(
      { actorUserId, seasonId, tenantId },
      db.prisma
    )

    expect(
      db.state.ledgerTransactions.some((row) =>
        row.idempotencyKey.startsWith("business-profit:")
      )
    ).toBe(false)
    // Members are still owed their share, drawn from opening equity (4000).
    expect(db.balance("2300")).toBe(-1000)
  })

  test("records nothing before the season is shared", async () => {
    const db = createDb({ seasonStatus: "approved" })

    const result = await recordProfitOwedForSeason(
      { seasonId, tenantId },
      db.prisma
    )

    expect(result.created).toBe(0)
    expect(db.state.ledgerTransactions).toHaveLength(0)
  })

  test("records nothing for a season brought in from before Halaalvest", async () => {
    const db = createDb({ liveProfit: false })

    const result = await recordProfitOwedForSeason(
      { seasonId, tenantId },
      db.prisma
    )

    expect(result.created).toBe(0)
  })
})

describe("payOutProfit", () => {
  test("pays everyone owed to savings and clears the payable", async () => {
    const db = createDb()

    const result = await payOutProfit(pay(), db.prisma)

    expect(result.state).toBe("paid:2:1000")
    expect(db.balance("2300")).toBe(0)
    expect(db.balance("1000")).toBe(-1000)
    expect(db.state.contributions).toHaveLength(2)
    expect(db.state.contributions[0]).toMatchObject({
      amount: 600,
      committedAmount: null,
      extraSavingsAmount: 600,
      memberId: aisha,
      status: "posted",
    })
    expect(db.state.members[aisha]!.snapshot).toBe(600)
    expect(db.state.payouts.map((row) => [row.memberId, row.status])).toEqual([
      [aisha, "paid"],
      [bilal, "paid"],
    ])
    expect(
      db.state.auditLogs.filter(
        (row) => row.action === "business.profit_payout.paid"
      )
    ).toHaveLength(2)
  })

  test("pays a member by bank transfer when overridden, with the reference", async () => {
    const db = createDb()

    await payOutProfit(
      pay({ overrides: { [bilal]: "bank_transfer" }, reference: "TRF-2207" }),
      db.prisma
    )

    // ₦1,000 of business profit came in; ₦400 went out by transfer.
    expect(db.balance("2000")).toBe(600)
    expect(db.balance("1000")).toBe(-600)
    expect(db.state.contributions.map((row) => row.memberId)).toEqual([aisha])
    expect(
      db.state.payouts.find((row) => row.memberId === bilal)
    ).toMatchObject({
      destination: "bank_transfer",
      reference: "TRF-2207",
    })
    expect(db.state.members[bilal]!.snapshot).toBe(0)
  })

  test("never pays a member twice", async () => {
    const db = createDb()
    const command = pay({ memberId: aisha })

    await payOutProfit(command, db.prisma)
    const replay = await payOutProfit(command, db.prisma)

    expect(replay.replayed).toBe(true)
    await expect(
      payOutProfit(pay({ memberId: aisha }), db.prisma)
    ).rejects.toThrow("already paid")

    // The bulk payout skips Aisha and pays only Bilal.
    const bulk = await payOutProfit(pay(), db.prisma)
    expect(bulk.state).toBe("paid:1:400")
    await expect(payOutProfit(pay(), db.prisma)).rejects.toThrow(
      "already been paid"
    )

    expect(db.state.payouts).toHaveLength(2)
    expect(db.balance("2300")).toBe(0)
    expect(db.state.members[aisha]!.snapshot).toBe(600)
  })

  test("a payout racing another one is refused and leaves nothing behind", async () => {
    const db = createDb()
    // Another tab paid Aisha between this payout's read and its write.
    const original = db.state
    const findMany = (db.prisma as any).profitPayout.findMany
    ;(db.prisma as any).profitPayout.findMany = async () => {
      const rows = await findMany({ where: {} })
      original.payouts.push({
        dividendPeriodId: seasonId,
        id: "other-tab",
        memberId: aisha,
        status: "paid",
      })
      return rows
    }

    await expect(payOutProfit(pay(), db.prisma)).rejects.toThrow(
      "Someone else just paid out this season"
    )
    expect(db.state.contributions).toHaveLength(0)
  })

  test("refuses a season that is not shared yet", async () => {
    const db = createDb({ seasonStatus: "approved" })

    await expect(payOutProfit(pay(), db.prisma)).rejects.toThrow(
      "Share this season with members before paying it out."
    )
  })

  test("refuses a season brought in from before Halaalvest", async () => {
    const db = createDb({ liveProfit: false })

    await expect(payOutProfit(pay(), db.prisma)).rejects.toThrow(
      "isn't paid out here"
    )
  })
})

describe("reverseProfitPayout", () => {
  const reverse = (payoutId: string) => ({
    actorUserId,
    commandId: crypto.randomUUID(),
    payoutId,
    reason: "Paid to the wrong member",
    tenantId,
  })

  test("restores the payable and lets the member be paid again", async () => {
    const db = createDb()
    await payOutProfit(pay({ memberId: aisha }), db.prisma)
    const payoutId = db.state.payouts[0]!.id as string

    await reverseProfitPayout(reverse(payoutId), db.prisma)

    expect(db.state.payouts[0]).toMatchObject({ status: "reversed" })
    expect(db.state.contributions[0]).toMatchObject({ status: "reversed" })
    expect(db.state.members[aisha]!.snapshot).toBe(0)
    // Aisha is owed again: 600 for her plus Bilal's unpaid 400.
    expect(db.balance("2300")).toBe(-1000)
    await expect(
      reverseProfitPayout(reverse(payoutId), db.prisma)
    ).rejects.toThrow("already undone")

    await payOutProfit(pay({ destination: "cash", memberId: aisha }), db.prisma)

    expect(db.state.payouts).toHaveLength(1)
    expect(db.state.payouts[0]).toMatchObject({
      destination: "cash",
      payCount: 2,
      status: "paid",
    })
    expect(db.balance("2300")).toBe(-400)
  })

  test("refuses to undo a savings payout the member already spent", async () => {
    const db = createDb()
    await payOutProfit(pay({ memberId: aisha }), db.prisma)
    db.state.withdrawals[aisha] = 500

    await expect(
      reverseProfitPayout(reverse(db.state.payouts[0]!.id), db.prisma)
    ).rejects.toThrow("already used this money")
    expect(db.state.payouts[0]).toMatchObject({ status: "paid" })
  })

  test("needs a reason", async () => {
    const db = createDb()

    await expect(
      reverseProfitPayout({ ...reverse("x"), reason: "  " }, db.prisma)
    ).rejects.toThrow("Say why")
  })
})
