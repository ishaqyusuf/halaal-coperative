import { describe, expect, test } from "bun:test"
import { backfillOpeningBalanceLedgerPostings } from "./opening-balance-ledger-backfill"

const openingDate = new Date("2025-11-03T00:00:00.000Z")

function createBackfillPrismaStub(existingReferences: string[] = []) {
  const posted: any[] = []
  const audits: any[] = []
  const references = new Set(existingReferences)
  const accounts = [
    { code: "1000", id: "acct-1000" },
    { code: "1100", id: "acct-1100" },
    { code: "2000", id: "acct-2000" },
    { code: "3000", id: "acct-3000" },
    { code: "3100", id: "acct-3100" },
    { code: "3200", id: "acct-3200" },
    { code: "4000", id: "acct-4000" },
  ]
  const client: any = {
    auditLog: {
      create: async (input: any) => {
        audits.push(input.data)
        return { id: `audit-${audits.length}` }
      },
    },
    ledgerAccount: {
      createMany: async () => ({ count: 0 }),
      findMany: async () => accounts,
    },
    ledgerTransaction: {
      create: async (input: any) => {
        posted.push(input.data)
        references.add(input.data.reference)
        return { id: `txn-${posted.length}`, ...input.data }
      },
      findFirst: async (input: any) =>
        references.has(input.where.reference)
          ? { id: `existing-${input.where.reference}` }
          : null,
    },
    memberOpeningBalance: {
      findMany: async (input: any) => {
        expect(input.where.status).toBe("applied")
        return [
          {
            activeFinancingOutstanding: 1266667,
            appliedLoanId: "loan-opening",
            id: "ob-qa",
            memberId: "member-qa",
            openingDate,
            shareCapitalBalance: 10000,
            tenantId: "tenant-1",
          },
          {
            activeFinancingOutstanding: 0,
            appliedLoanId: null,
            id: "ob-aisha",
            memberId: "member-aisha",
            openingDate,
            shareCapitalBalance: 20000,
            tenantId: "tenant-1",
          },
        ]
      },
    },
  }
  client.$transaction = async (operation: any) => operation(client)

  return { audits, client, posted }
}

describe("opening balance ledger backfill (QA F3 correction)", () => {
  test("dry run reports the missing postings without writing", async () => {
    const stub = createBackfillPrismaStub([
      "opening-balance:ob-aisha:share-capital",
    ])

    const result = await backfillOpeningBalanceLedgerPostings(
      { apply: false },
      stub.client
    )

    expect(result.actions.map((action) => [action.kind, action.amount])).toEqual(
      [
        ["share_capital", 10000],
        ["financing", 1266667],
      ]
    )
    expect(stub.posted).toHaveLength(0)
    expect(stub.audits).toHaveLength(0)
  })

  test("apply posts balanced entries at the opening date with audit evidence, and reruns are no-ops", async () => {
    const stub = createBackfillPrismaStub()

    const first = await backfillOpeningBalanceLedgerPostings(
      { apply: true },
      stub.client
    )

    expect(first.actions).toHaveLength(3)
    expect(stub.posted.map((data) => data.reference)).toEqual([
      "opening-balance:ob-qa:share-capital",
      "opening-balance:ob-qa:financing",
      "opening-balance:ob-aisha:share-capital",
    ])
    const financing = stub.posted[1]
    expect(financing).toMatchObject({
      idempotencyKey: "opening-balance:ob-qa:financing",
      loanId: "loan-opening",
      postedAt: openingDate,
    })
    expect(
      financing.entries.create.map((entry: any) => [
        entry.ledgerAccountId,
        entry.direction,
        entry.amount,
      ])
    ).toEqual([
      ["acct-1100", "debit", 1266667],
      ["acct-4000", "credit", 1266667],
    ])
    expect(stub.audits.map((audit) => audit.action)).toEqual([
      "migration.opening_balance.ledger_backfilled",
      "migration.opening_balance.ledger_backfilled",
      "migration.opening_balance.ledger_backfilled",
    ])

    const second = await backfillOpeningBalanceLedgerPostings(
      { apply: true },
      stub.client
    )
    expect(second.actions).toHaveLength(0)
    expect(stub.posted).toHaveLength(3)
  })
})
