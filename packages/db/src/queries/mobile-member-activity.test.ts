import { describe, expect, test } from "bun:test"
import { getMobileMemberActivityPage } from "./mobile-member-activity"

const member = {
  email: "member@example.test",
  fullName: "Amina Member",
  id: "member-1",
  kycStatus: "verified",
  memberNumber: "MEM-001",
  status: "active",
}

function createPrismaStub() {
  return {
    contribution: {
      findMany: async () => [
        {
          amount: 55_000,
          channel: "payroll",
          extraSavingsAmount: 5_000,
          id: "contribution-2",
          periodLabel: "August 2026",
          postedAt: new Date("2026-08-02T00:00:00.000Z"),
          reference: "PAY-2",
        },
        {
          amount: 50_000,
          channel: "payroll",
          extraSavingsAmount: 0,
          id: "contribution-1",
          periodLabel: "July 2026",
          postedAt: new Date("2026-07-02T00:00:00.000Z"),
          reference: "PAY-1",
        },
      ],
    },
    ledgerTransaction: {
      findMany: async () => [
        {
          entries: [
            { amount: 50_000, direction: "debit" },
            { amount: 50_000, direction: "credit" },
          ],
          id: "ledger-1",
          narration: "Contribution posted",
          postedAt: new Date("2026-08-02T00:00:00.000Z"),
          reference: "PAY-2",
          transactionType: "contribution_posting",
        },
      ],
    },
    member: { findFirst: async () => member },
    memberShareLedgerEntry: {
      findMany: async () => [
        {
          amount: 25_000,
          effectiveDate: new Date("2026-08-01T00:00:00.000Z"),
          id: "share-1",
          notes: "Optional share purchase",
          sourceType: "member_purchase",
        },
      ],
    },
  }
}

describe("mobile member activity", () => {
  test("paginates posted commitment history with a stable opaque cursor", async () => {
    let observedQuery: { where?: unknown } | null = null
    const prisma = createPrismaStub()
    const originalFindMany = prisma.contribution.findMany
    prisma.contribution.findMany = async (query?: { where?: unknown }) => {
      observedQuery = query ?? null
      return originalFindMany()
    }
    const page = await getMobileMemberActivityPage(
      {
        kind: "commitments",
        limit: 1,
        tenantId: "tenant-1",
        userId: "user-1",
      },
      prisma as never
    )

    expect(page.items).toEqual([
      expect.objectContaining({
        key: "contribution-contribution-2",
        status: "Posted",
        value: 55_000,
      }),
    ])
    expect(page.items[0]?.detail).toContain("Special savings 5000")
    expect(page.nextCursor).toBe("2026-08-02T00:00:00.000Z|contribution-2")
    expect(observedQuery?.where).toMatchObject({
      memberId: "member-1",
      status: "posted",
      tenantId: "tenant-1",
    })
  })

  test("applies cursor boundaries inside the signed member scope", async () => {
    let observedQuery: { where?: unknown } | null = null
    const prisma = createPrismaStub()
    prisma.contribution.findMany = async (query?: { where?: unknown }) => {
      observedQuery = query ?? null
      return []
    }

    await getMobileMemberActivityPage(
      {
        cursor: "2026-08-02T00:00:00.000Z|contribution-2",
        kind: "commitments",
        tenantId: "tenant-1",
        userId: "user-1",
      },
      prisma as never
    )

    expect(observedQuery?.where).toMatchObject({
      memberId: "member-1",
      tenantId: "tenant-1",
    })
    expect((observedQuery?.where as { OR?: unknown[] }).OR).toHaveLength(2)
  })

  test("keeps share history distinct from published profit evidence", async () => {
    const page = await getMobileMemberActivityPage(
      {
        kind: "shares",
        tenantId: "tenant-1",
        userId: "user-1",
      },
      createPrismaStub() as never
    )

    expect(page.items).toEqual([
      expect.objectContaining({
        key: "share-ledger-share-1",
        label: "Optional share purchase",
        value: 25_000,
      }),
    ])
    expect(page.nextCursor).toBeNull()
  })

  test("reports one-sided accounting value for statement activity", async () => {
    const page = await getMobileMemberActivityPage(
      {
        kind: "statement",
        tenantId: "tenant-1",
        userId: "user-1",
      },
      createPrismaStub() as never
    )

    expect(page.items[0]).toMatchObject({
      key: "ledger-ledger-1",
      label: "Contribution posted",
      value: 50_000,
    })
  })

  test("paginates statement activity inside the signed member scope", async () => {
    let observedQuery: { where?: unknown } | null = null
    const prisma = createPrismaStub()
    prisma.ledgerTransaction.findMany = async (query?: { where?: unknown }) => {
      observedQuery = query ?? null

      return [
        {
          entries: [
            { amount: 75_000, direction: "debit" },
            { amount: 75_000, direction: "credit" },
          ],
          id: "ledger-2",
          narration: "September contribution posted",
          postedAt: new Date("2026-09-02T00:00:00.000Z"),
          reference: "PAY-3",
          transactionType: "contribution_posting",
        },
        {
          entries: [
            { amount: 50_000, direction: "debit" },
            { amount: 50_000, direction: "credit" },
          ],
          id: "ledger-1",
          narration: "August contribution posted",
          postedAt: new Date("2026-08-02T00:00:00.000Z"),
          reference: "PAY-2",
          transactionType: "contribution_posting",
        },
      ]
    }

    const page = await getMobileMemberActivityPage(
      {
        kind: "statement",
        limit: 1,
        tenantId: "tenant-1",
        userId: "user-1",
      },
      prisma as never
    )

    expect(page.items).toEqual([
      expect.objectContaining({
        key: "ledger-ledger-2",
        value: 75_000,
      }),
    ])
    expect(page.nextCursor).toBe("2026-09-02T00:00:00.000Z|ledger-2")
    expect(observedQuery?.where).toMatchObject({
      memberId: "member-1",
      tenantId: "tenant-1",
    })
  })
})
