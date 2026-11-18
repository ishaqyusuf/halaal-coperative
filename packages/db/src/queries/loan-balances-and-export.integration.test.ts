import { describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import { getDeployableFundsSnapshot } from "./financing-cycles"
import { listLoanExportBatch } from "./loan-export"
import {
  getMemberStatementSummary,
  listMemberStatementSummaries,
} from "./members"
import { financingBlockingLoanStatuses } from "./loan-statuses"

// Triage 1.5 and 0.8 on the local database. Every write happens inside a
// transaction that is rolled back at the end.
const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const rollback = new Error("rollback")

async function inRolledBackTransaction(work: (tx: any) => Promise<void>) {
  await (db as any)
    .$transaction(
      async (tx: any) => {
        await work(tx)
        throw rollback
      },
      { timeout: 60_000 }
    )
    .catch((error: unknown) => {
      if (error !== rollback) throw error
    })
}

// Hides `$queryRaw`, so reads take the Prisma reference path.
function withoutRaw<T extends object>(client: T): T {
  return new Proxy(client, {
    get: (target, key) =>
      key === "$queryRaw" ? undefined : Reflect.get(target, key),
  })
}

const cents = (value: number) => Math.round(value * 100)

async function readAllExportRows(
  client: any,
  tenantId: string,
  range: { fromDate?: Date; toDate?: Date },
  limit = 3
) {
  const rows = []
  let cursor: string | null = null
  for (;;) {
    const batch = await listLoanExportBatch(
      tenantId,
      { ...range, cursor, limit },
      client
    )
    rows.push(...batch.rows)
    if (!batch.nextCursor) return rows
    cursor = batch.nextCursor
  }
}

run("approved loans not yet paid out (local database)", () => {
  it("leaves them out of what members owe, in the SQL and Prisma reads alike", async () => {
    const client = db as any
    const loans: Array<{
      memberId: string
      outstandingPrincipal: unknown
      principalAmount: unknown
      status: string
      tenantId: string
    }> = await client.loan.findMany({
      select: {
        memberId: true,
        outstandingPrincipal: true,
        principalAmount: true,
        status: true,
        tenantId: true,
      },
    })
    const members = [
      ...new Map(loans.map((loan) => [loan.memberId, loan.tenantId])),
    ]
    expect(members.length).toBeGreaterThan(0)

    for (const [memberId, tenantId] of members) {
      const own = loans.filter((loan) => loan.memberId === memberId)
      const expectedOwed = own
        .filter((loan) =>
          ["disbursed", "active", "defaulted"].includes(loan.status)
        )
        .reduce((sum, loan) => sum + Number(loan.outstandingPrincipal), 0)
      const approved = own.filter((loan) => loan.status === "approved")
      const expectedApproved = approved.reduce(
        (sum, loan) => sum + Number(loan.principalAmount),
        0
      )

      const [sql, [reference]] = await Promise.all([
        getMemberStatementSummary(tenantId, memberId, client),
        listMemberStatementSummaries(tenantId, withoutRaw(client), memberId),
      ])

      for (const summary of [sql, reference]) {
        expect({
          memberId,
          approved: cents(summary?.approvedNotPaidOutAmount ?? -1),
          approvedCount: summary?.approvedNotPaidOutCount,
          owed: cents(summary?.totalOutstandingPrincipal ?? -1),
        }).toEqual({
          memberId,
          approved: cents(expectedApproved),
          approvedCount: approved.length,
          owed: cents(expectedOwed),
        })
      }
      expect(sql?.activeLoanCount).toBe(reference?.activeLoanCount)
      expect(cents(sql?.totalLoanPrincipal ?? 0)).toBe(
        cents(reference?.totalLoanPrincipal ?? 0)
      )
    }
  })

  it("moves a loan from the separate line to what is owed once it is paid out, while lending capacity holds it either way", async () => {
    await inRolledBackTransaction(async (tx) => {
      const loan = await tx.loan.findFirst({
        orderBy: { id: "asc" },
        select: {
          id: true,
          memberId: true,
          principalAmount: true,
          tenantId: true,
        },
        where: { status: "approved" },
      })
      expect(loan).not.toBeNull()
      const principal = Number(loan.principalAmount)

      const beforeSummary = await getMemberStatementSummary(
        loan.tenantId,
        loan.memberId,
        tx
      )
      const beforeFunds = await getDeployableFundsSnapshot(
        { tenantId: loan.tenantId },
        tx
      )

      // Paid out: the hold becomes outstanding financing.
      await tx.loan.update({
        data: {
          disbursedAt: new Date(),
          outstandingPrincipal: principal,
          status: "disbursed",
        },
        where: { id: loan.id },
      })

      const afterSummary = await getMemberStatementSummary(
        loan.tenantId,
        loan.memberId,
        tx
      )
      const afterFunds = await getDeployableFundsSnapshot(
        { tenantId: loan.tenantId },
        tx
      )

      expect(
        cents(
          (beforeSummary?.approvedNotPaidOutAmount ?? 0) -
            (afterSummary?.approvedNotPaidOutAmount ?? 0)
        )
      ).toBe(cents(principal))
      expect(
        cents(
          (afterSummary?.totalOutstandingPrincipal ?? 0) -
            (beforeSummary?.totalOutstandingPrincipal ?? 0)
        )
      ).toBe(cents(principal))
      // Before payout the cooperative already held the money back.
      expect(
        cents(beforeFunds.approvedHoldAmount - afterFunds.approvedHoldAmount)
      ).toBe(cents(principal))
      expect(
        cents(
          afterFunds.outstandingFinancingAmount -
            beforeFunds.outstandingFinancingAmount
        )
      ).toBe(cents(principal))
      // So the money that can be lent does not change at payout.
      expect(cents(afterFunds.deployableFunds)).toBe(
        cents(beforeFunds.deployableFunds)
      )
    })
  })

  it("the mobile procurement check treats an approved, unpaid loan as active financing", () => {
    expect(financingBlockingLoanStatuses).toContain("approved")
  })
})

run("loans export date filter (local database)", () => {
  it("lists paid-out loans by payout date and unpaid requests by request date", async () => {
    await inRolledBackTransaction(async (tx) => {
      const paidOut = await tx.loan.findFirst({
        orderBy: { id: "asc" },
        select: { id: true, loanRequestId: true, tenantId: true },
        where: { disbursedAt: { not: null } },
      })
      expect(paidOut).not.toBeNull()
      const approved = await tx.loan.findFirst({
        orderBy: { id: "asc" },
        select: { id: true, loanRequestId: true, tenantId: true },
        where: {
          disbursedAt: null,
          status: "approved",
          tenantId: paidOut.tenantId,
        },
      })

      // Asked for in 2031, paid out in 2033.
      await tx.loanRequest.update({
        data: { requestedAt: new Date("2031-02-10T09:00:00.000Z") },
        where: { id: paidOut.loanRequestId },
      })
      await tx.loan.update({
        data: { disbursedAt: new Date("2033-05-20T09:00:00.000Z") },
        where: { id: paidOut.id },
      })
      if (approved) {
        await tx.loanRequest.update({
          data: { requestedAt: new Date("2031-02-11T09:00:00.000Z") },
          where: { id: approved.loanRequestId },
        })
      }

      const tenantId = paidOut.tenantId
      const in2031 = await readAllExportRows(tx, tenantId, {
        fromDate: new Date("2031-01-01T00:00:00.000Z"),
        toDate: new Date("2031-12-31T23:59:59.999Z"),
      })
      const in2033 = await readAllExportRows(tx, tenantId, {
        fromDate: new Date("2033-01-01T00:00:00.000Z"),
        toDate: new Date("2033-12-31T23:59:59.999Z"),
      })

      // The paid-out loan is a loan row in the payout year, never a request.
      expect(in2033.map((row) => [row.recordType, row.id])).toEqual([
        ["loan", paidOut.id],
      ])
      expect(in2033[0]?.dateUsedLabel).toBe("Paid out")
      expect(in2031.some((row) => row.id === paidOut.loanRequestId)).toBe(false)
      expect(in2031.some((row) => row.id === paidOut.id)).toBe(false)

      // The approved, unpaid loan is a request row in the year it was asked for.
      if (approved) {
        expect(in2031.map((row) => [row.recordType, row.id])).toEqual([
          ["request", approved.loanRequestId],
        ])
        expect(in2031[0]?.dateUsedLabel).toBe("Asked for")
        expect(in2031[0]?.status).toBe("approved")
      }
    })
  })

  it("lists every request once, and small batches read the same rows as one", async () => {
    const client = db as any
    const tenants: Array<{ id: string }> = await client.tenant.findMany({
      select: { id: true },
    })

    for (const { id: tenantId } of tenants) {
      const [all, batched, requestCount, paidOutCount] = await Promise.all([
        readAllExportRows(client, tenantId, {}, 5_000),
        readAllExportRows(client, tenantId, {}, 2),
        client.loanRequest.count({
          where: {
            tenantId,
            OR: [
              { loan: { is: null } },
              { loan: { is: { disbursedAt: null, status: "approved" } } },
            ],
          },
        }),
        client.loan.count({
          where: {
            tenantId,
            OR: [
              { disbursedAt: { not: null } },
              { status: { not: "approved" } },
            ],
          },
        }),
      ])

      expect(batched.map((row) => row.cursor)).toEqual(
        all.map((row) => row.cursor)
      )
      expect(all.filter((row) => row.recordType === "request")).toHaveLength(
        requestCount
      )
      expect(all.filter((row) => row.recordType === "loan")).toHaveLength(
        paidOutCount
      )
    }
  })
})
