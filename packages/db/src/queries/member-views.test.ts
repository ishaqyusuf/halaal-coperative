import { describe, expect, test } from "bun:test"
import type { Prisma } from "../../generated/prisma/client"
import {
  getMemberStatementView,
  getOwnMemberStatementView,
  MEMBER_STATEMENT_PAGE_SIZE,
} from "./member-views"

function createStatementPrismaStub(postingCount: number, memberExists = true) {
  const memberReads: unknown[] = []
  const ledgerReads: Prisma.LedgerTransactionFindManyArgs[] = []
  const postings = Array.from({ length: postingCount }, (_, index) => ({
    entries: [],
    id: `txn-${index}`,
    narration: null,
    postedAt: new Date(Date.UTC(2026, 0, 1) - index * 86_400_000),
    transactionType: "contribution",
  }))

  return {
    ledgerReads,
    memberReads,
    prisma: {
      $queryRaw: async () => [],
      chargeApplication: { findMany: async () => [] },
      dividendAllocation: { findMany: async () => [] },
      ledgerTransaction: {
        findMany: async (args: Prisma.LedgerTransactionFindManyArgs) => {
          ledgerReads.push(args)
          const start = args.skip ?? 0
          return postings.slice(
            start,
            args.take === undefined ? undefined : start + args.take
          )
        },
      },
      member: {
        findFirst: async (args: { where: unknown }) => {
          memberReads.push(args.where)
          if (!memberExists) return null

          return {
            deductionSource: null,
            fullName: "Aisha Bello",
            id: "member-1",
            joinedAt: new Date("2025-01-01T00:00:00.000Z"),
            memberNumber: "M-001",
            status: "active",
          }
        },
      },
    },
  }
}

describe("member statement postings paging", () => {
  test("reads one page of postings plus one row to know about older ones", async () => {
    const { ledgerReads, prisma } = createStatementPrismaStub(250)

    const view = await getMemberStatementView(
      "tenant-1",
      "member-1",
      prisma as never,
      { page: 2 }
    )

    expect(ledgerReads[0]).toMatchObject({
      skip: MEMBER_STATEMENT_PAGE_SIZE,
      take: MEMBER_STATEMENT_PAGE_SIZE + 1,
      where: { memberId: "member-1", tenantId: "tenant-1" },
    })
    expect(view?.ledgerTransactions).toHaveLength(MEMBER_STATEMENT_PAGE_SIZE)
    expect(view?.ledgerTransactions[0]?.id).toBe("txn-100")
    expect(view?.postings).toEqual({
      hasOlder: true,
      page: 2,
      pageSize: MEMBER_STATEMENT_PAGE_SIZE,
    })
  })

  test("the last page has no older postings", async () => {
    const { prisma } = createStatementPrismaStub(250)

    const view = await getMemberStatementView(
      "tenant-1",
      "member-1",
      prisma as never,
      { page: 3 }
    )

    expect(view?.ledgerTransactions).toHaveLength(50)
    expect(view?.postings.hasOlder).toBe(false)
  })

  test("defaults to the newest page", async () => {
    const { ledgerReads, prisma } = createStatementPrismaStub(5)

    const view = await getMemberStatementView(
      "tenant-1",
      "member-1",
      prisma as never
    )

    expect(ledgerReads[0]).toMatchObject({ skip: 0 })
    expect(view?.postings).toEqual({
      hasOlder: false,
      page: 1,
      pageSize: MEMBER_STATEMENT_PAGE_SIZE,
    })
  })

  test("downloads read every posting", async () => {
    const { ledgerReads, prisma } = createStatementPrismaStub(250)

    const view = await getMemberStatementView(
      "tenant-1",
      "member-1",
      prisma as never,
      { allPostings: true }
    )

    expect(ledgerReads[0]?.take).toBeUndefined()
    expect(view?.ledgerTransactions).toHaveLength(250)
    expect(view?.postings).toEqual({
      hasOlder: false,
      page: null,
      pageSize: null,
    })
  })
})

describe("own member statement download", () => {
  test("scopes the header to the signed-in user and loads their full posting history", async () => {
    const { ledgerReads, memberReads, prisma } =
      createStatementPrismaStub(250)

    const view = await getOwnMemberStatementView(
      { tenantId: "tenant-1", userId: "user-1" },
      prisma as never
    )

    expect(memberReads).toEqual([{ tenantId: "tenant-1", userId: "user-1" }])
    expect(ledgerReads).toHaveLength(1)
    expect(ledgerReads[0]).toMatchObject({
      where: { memberId: "member-1", tenantId: "tenant-1" },
    })
    expect(ledgerReads[0]?.take).toBeUndefined()
    expect(view?.ledgerTransactions).toHaveLength(250)
    expect(view?.ledgerTransactions.at(-1)?.id).toBe("txn-249")
  })

  test("short-circuits when the signed-in user has no profile in this tenant", async () => {
    const { ledgerReads, memberReads, prisma } =
      createStatementPrismaStub(250, false)

    const view = await getOwnMemberStatementView(
      { tenantId: "tenant-2", userId: "user-1" },
      prisma as never
    )

    expect(view).toBeNull()
    expect(memberReads).toEqual([{ tenantId: "tenant-2", userId: "user-1" }])
    expect(ledgerReads).toHaveLength(0)
  })
})
