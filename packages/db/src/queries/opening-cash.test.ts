import { describe, expect, test } from "bun:test"
import { getDeployableFundsSnapshot } from "./financing-cycles"
import {
  getTenantOpeningCashAmount,
  OPENING_CASH_LEDGER_REFERENCE,
  setTenantOpeningCash,
} from "./opening-cash"

const tenantId = "tenant-1"

type Entry = {
  accountId: string
  amount: number
  direction: "credit" | "debit"
  transactionId: string
}

type Transaction = {
  id: string
  idempotencyKey?: string
  reference?: string
}

/** An in-memory general ledger plus the funding sums deployable funds read. */
function createLedgerStore(input: {
  contributionAmount?: number
  status: "historical_setup_in_progress" | "live_operations"
}) {
  const accounts = new Map<string, string>()
  const transactions: Transaction[] = []
  const entries: Entry[] = []
  const audits: Array<Record<string, any>> = []
  const codeOf = (accountId: string) =>
    [...accounts.entries()].find(([, id]) => id === accountId)?.[0]

  const client: any = {
    auditLog: {
      create: async ({ data }: { data: Record<string, any> }) => {
        audits.push(data)
        return data
      },
    },
    contribution: {
      aggregate: async () => ({
        _sum: { amount: input.contributionAmount ?? 0 },
      }),
    },
    ledgerAccount: {
      createMany: async ({ data }: { data: Array<{ code: string }> }) => {
        for (const account of data) {
          if (!accounts.has(account.code)) {
            accounts.set(account.code, `account-${account.code}`)
          }
        }
        return { count: data.length }
      },
      findMany: async () =>
        [...accounts.entries()].map(([code, id]) => ({ code, id })),
    },
    ledgerEntry: {
      groupBy: async ({ where }: { where: Record<string, any> }) => {
        const sums = new Map<string, number>()

        for (const entry of entries) {
          const transaction = transactions.find(
            (row) => row.id === entry.transactionId
          )
          if (codeOf(entry.accountId) !== where.ledgerAccount.code) continue
          if (transaction?.reference !== where.ledgerTransaction.reference) {
            continue
          }
          sums.set(
            entry.direction,
            (sums.get(entry.direction) ?? 0) + entry.amount
          )
        }

        return [...sums.entries()].map(([direction, amount]) => ({
          _sum: { amount },
          direction,
        }))
      },
    },
    ledgerTransaction: {
      count: async ({ where }: { where: { reference: string } }) =>
        transactions.filter((row) => row.reference === where.reference)
          .length,
      create: async ({ data }: { data: Record<string, any> }) => {
        if (
          data.idempotencyKey &&
          transactions.some((row) => row.idempotencyKey === data.idempotencyKey)
        ) {
          throw Object.assign(new Error("Unique constraint"), {
            code: "P2002",
          })
        }

        const transaction = {
          id: `txn-${transactions.length + 1}`,
          idempotencyKey: data.idempotencyKey,
          reference: data.reference,
        }
        transactions.push(transaction)

        for (const entry of data.entries.create) {
          entries.push({
            accountId: entry.ledgerAccountId,
            amount: entry.amount,
            direction: entry.direction,
            transactionId: transaction.id,
          })
        }

        return { ...transaction, entries: data.entries.create }
      },
    },
    tenant: {
      findUnique: async () => ({
        initialMigrationStatus: input.status,
        migrationEmergencyUnlockUntil: null,
      }),
    },
  }
  client.$transaction = async (callback: (tx: unknown) => unknown) =>
    callback(client)

  function balance(code: string) {
    return entries
      .filter((entry) => codeOf(entry.accountId) === code)
      .reduce(
        (sum, entry) =>
          sum + (entry.direction === "debit" ? entry.amount : -entry.amount),
        0
      )
  }

  return { audits, balance, client, entries, transactions }
}

describe("cooperative opening cash (triage 1.9)", () => {
  test("posts Dr Cash / Cr Cooperative Equity once", async () => {
    const store = createLedgerStore({ status: "historical_setup_in_progress" })

    const first = await setTenantOpeningCash(
      { actorUserId: "owner-1", amount: 250000, tenantId },
      store.client
    )

    expect(first).toEqual({ amount: 250000, changed: true, previousAmount: 0 })
    expect(store.balance("2000")).toBe(250000)
    expect(store.balance("4000")).toBe(-250000)
    expect(store.transactions[0]).toMatchObject({
      idempotencyKey: "opening-cash:1",
      reference: OPENING_CASH_LEDGER_REFERENCE,
    })
    expect(store.audits[0]).toMatchObject({
      action: "opening_cash.set",
      metadata: { amount: 250000, previousAmount: 0 },
    })
  })

  test("saving the same figure again posts nothing", async () => {
    const store = createLedgerStore({ status: "historical_setup_in_progress" })
    const save = () =>
      setTenantOpeningCash(
        { actorUserId: "owner-1", amount: 250000, tenantId },
        store.client
      )

    await save()
    const again = await save()

    expect(again.changed).toBe(false)
    expect(store.transactions).toHaveLength(1)
  })

  test("a change before go-live posts only the difference, and ₦0 clears it", async () => {
    const store = createLedgerStore({ status: "historical_setup_in_progress" })
    const save = (amount: number) =>
      setTenantOpeningCash(
        { actorUserId: "owner-1", amount, tenantId },
        store.client
      )

    await save(250000)
    await save(200000)
    expect(await getTenantOpeningCashAmount(tenantId, store.client)).toBe(
      200000
    )
    expect(store.transactions.map((row) => row.idempotencyKey)).toEqual([
      "opening-cash:1",
      "opening-cash:2",
    ])

    await save(250000)
    await save(0)
    expect(await getTenantOpeningCashAmount(tenantId, store.client)).toBe(0)
    expect(store.balance("2000")).toBe(0)
    expect(store.balance("4000")).toBe(0)
  })

  test("can't change after go-live", async () => {
    const store = createLedgerStore({ status: "live_operations" })

    await expect(
      setTenantOpeningCash(
        { actorUserId: "owner-1", amount: 250000, tenantId },
        store.client
      )
    ).rejects.toThrow("Opening cash can't change after")
    expect(store.transactions).toHaveLength(0)
  })

  test("refuses a negative figure", async () => {
    const store = createLedgerStore({ status: "historical_setup_in_progress" })

    await expect(
      setTenantOpeningCash(
        { actorUserId: "owner-1", amount: -1, tenantId },
        store.client
      )
    ).rejects.toThrow("₦0 or more")
  })

  test("adds to deployable funds and lending capacity", async () => {
    const store = createLedgerStore({
      contributionAmount: 40000,
      status: "historical_setup_in_progress",
    })

    const before = await getDeployableFundsSnapshot({ tenantId }, store.client)
    expect(before).toMatchObject({
      deployableFunds: 40000,
      openingCashAmount: 0,
    })

    await setTenantOpeningCash(
      { actorUserId: "owner-1", amount: 250000, tenantId },
      store.client
    )

    const after = await getDeployableFundsSnapshot({ tenantId }, store.client)
    expect(after).toMatchObject({
      availablePoolAmount: 290000,
      deployableFunds: 290000,
      memberFundsHeldAmount: 290000,
      openingCashAmount: 250000,
    })
  })
})
