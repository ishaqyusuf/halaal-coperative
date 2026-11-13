import { describe, expect, test } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import { recordCooperativeMobileRemittance } from "./cooperative-mobile-billing"

function summary(overrides: Record<string, unknown> = {}) {
  return {
    id: "invoice-1",
    period: "2026-10",
    status: "paid",
    paidAt: new Date("2026-11-01T00:00:00.000Z"),
    paymentReference: "ref-1",
    accrualPostedAt: new Date("2026-11-01T00:00:00.000Z"),
    remittancePostedAt: null,
    ...overrides,
  }
}

// The first transaction claims the remittance; any later one is the inline
// accounting post. The stub does not run the callbacks, so only the sequencing
// and the best-effort handling are under test here.
function stubDb(input: {
  claimed: ReturnType<typeof summary>
  post?: () => Promise<unknown>
}) {
  const transactions: unknown[] = []
  const db = {
    $transaction: async (_fn: unknown, options: unknown) => {
      transactions.push(options)
      if (transactions.length === 1) return input.claimed
      return input.post ? input.post() : false
    },
  } as unknown as PrismaClient
  return { db, transactions }
}

const remittance = {
  actorUserId: "user-1",
  invoiceId: "invoice-1",
  paidAt: "2026-11-01",
  reference: "ref-1",
}

describe("recordCooperativeMobileRemittance inline accounting", () => {
  test("posts accounting right after a newly recorded remittance", async () => {
    const { db, transactions } = stubDb({ claimed: summary() })

    const result = await recordCooperativeMobileRemittance(remittance, db)

    expect(result.status).toBe("paid")
    expect(transactions).toHaveLength(2)
  })

  test("a failed inline post leaves the recorded remittance for the daily job", async () => {
    const { db, transactions } = stubDb({
      claimed: summary(),
      post: async () => {
        throw new Error("serialization failure")
      },
    })

    const result = await recordCooperativeMobileRemittance(remittance, db)

    expect(result.id).toBe("invoice-1")
    expect(transactions).toHaveLength(2)
  })

  test("skips the post when the remittance is already posted", async () => {
    const { db, transactions } = stubDb({
      claimed: summary({ remittancePostedAt: new Date() }),
    })

    await recordCooperativeMobileRemittance(remittance, db)

    expect(transactions).toHaveLength(1)
  })

  test("rejects invalid input before touching the database", async () => {
    const { db, transactions } = stubDb({ claimed: summary() })

    await expect(
      recordCooperativeMobileRemittance({ ...remittance, reference: " " }, db)
    ).rejects.toThrow()
    expect(transactions).toHaveLength(0)
  })
})
