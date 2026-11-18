import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client"
import { normalizePostgresConnectionString } from "../postgres-connection"
import { getMemberByUserId, getMemberStatementDetail } from "./members"
import { getMobileMemberActivityPage } from "./mobile-member-activity"
import { getMobileMemberCommitments } from "./mobile-member-core"
import { getMobileMemberSharesSnapshot } from "./mobile-member-shares"
import { getMobileMemberStatementSnapshot } from "./mobile-member-statement"
import { createMobileMemberStatementExport } from "./mobile-report-exports"

const url = process.env.HALAALVEST_DATABASE_URL
const localUrl =
  url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname) ? url : null
const runIntegration = localUrl ? describe : describe.skip

runIntegration("mobile Plans and Statement reads", () => {
  let prisma: PrismaClient
  let tenantId: string
  let tenantSlug: string
  let userId: string
  let memberId: string
  let queries = 0

  class DelayedAdapter extends PrismaPg {
    override async connect() {
      const adapter = await super.connect()
      const queryRaw = adapter.queryRaw.bind(adapter)
      adapter.queryRaw = async (query) => {
        queries += 1
        await Bun.sleep(5)
        return queryRaw(query)
      }
      return adapter
    }
  }

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new DelayedAdapter({
        connectionString: normalizePostgresConnectionString(localUrl!),
      }),
    })
    const nonce = crypto.randomUUID().slice(0, 7)
    tenantSlug = `t07-integration-${nonce}`
    const tenant = await prisma.tenant.create({
      data: {
        name: "T07 integration cooperative",
        slug: tenantSlug,
        status: "active",
      },
    })
    tenantId = tenant.id
    const user = await prisma.user.create({
      data: {
        email: `${nonce}@example.test`,
        fullName: "Aisha Bello",
        tenantId,
      },
    })
    userId = user.id
    const member = await prisma.member.create({
      data: {
        fullName: user.fullName,
        joinedAt: new Date("2024-01-15"),
        memberNumber: "QHC-0042",
        memberType: "individual",
        status: "active",
        tenantId,
        totalSavingsSnapshot: 625_000,
        userId,
      },
    })
    memberId = member.id
    const other = await prisma.member.create({
      data: {
        fullName: "Other member",
        joinedAt: member.joinedAt,
        memberNumber: "QHC-0043",
        memberType: "individual",
        status: "active",
        tenantId,
      },
    })
    const plan = await prisma.contributionPlan.create({
      data: {
        amount: 25_000,
        memberId,
        name: "Monthly savings",
        startsAt: member.joinedAt,
        tenantId,
      },
    })
    const bank = await prisma.ledgerAccount.create({
      data: { accountType: "asset", code: "1010", name: "Bank", tenantId },
    })
    const savings = await prisma.ledgerAccount.create({
      data: {
        accountType: "liability",
        code: "1000",
        name: "Member savings",
        tenantId,
      },
    })
    await prisma.contribution.createMany({
      data: Array.from({ length: 26 }, (_, index) => ({
        amount: 25_000,
        channel: "payroll" as const,
        contributionPlanId: plan.id,
        extraSavingsAmount: index === 0 ? 2_000 : 0,
        memberId,
        postedAt: new Date(Date.UTC(2026, 4, 29 - index)),
        status: index === 25 ? "pending" : "posted",
        tenantId,
      })),
    })
    const date = new Date("2026-05-30T12:00:00Z")
    for (const [index, currentMember, transactionType] of [
      [0, memberId, "contribution"],
      [1, memberId, "loan_repayment"],
      [2, memberId, "contribution"],
      [3, other.id, "contribution"],
      [4, memberId, "dividend"],
    ] as const) {
      await prisma.ledgerTransaction.create({
        data: {
          entries: {
            create: [
              {
                amount: 25_000,
                direction: "debit",
                ledgerAccountId: bank.id,
                tenantId,
              },
              {
                amount: 25_000,
                direction: "credit",
                ledgerAccountId: savings.id,
                tenantId,
              },
            ],
          },
          memberId: currentMember,
          postedAt: date,
          reference: `T07-${index}`,
          tenantId,
          transactionType,
        },
      })
    }
    await prisma.memberShareLedgerEntry.create({
      data: {
        amount: 50_000,
        effectiveDate: date,
        memberId,
        sourceType: "backfill",
        tenantId,
      },
    })
  })

  afterAll(async () => {
    try {
      if (tenantId) await prisma.tenant.delete({ where: { id: tenantId } })
    } finally {
      await prisma?.$disconnect()
    }
  })

  test("keeps totals and details while paging within the selected member and category", async () => {
    const identity = { tenantId, userId }
    const [plans, first, statement, legacy, exported] = await Promise.all([
      getMobileMemberCommitments({ ...identity, summaryOnly: true }, prisma),
      getMobileMemberActivityPage({ ...identity, kind: "commitments" }, prisma),
      getMobileMemberStatementSnapshot(
        { ...identity, includeLedger: false },
        prisma
      ),
      getMobileMemberStatementSnapshot(identity, prisma),
      createMobileMemberStatementExport({ ...identity, tenantSlug }, prisma),
    ])
    expect(plans.rows.map((row) => row.label)).toEqual(["Monthly savings"])
    expect(
      plans.stats.find((metric) => metric.key === "contributions")?.value
    ).toBe(25)
    expect(first.items).toHaveLength(20)
    expect(first.items[0]?.extraSavings).toBe(2_000)
    const older = await getMobileMemberActivityPage(
      { ...identity, kind: "commitments", cursor: first.nextCursor },
      prisma
    )
    expect(older.items).toHaveLength(5)
    expect(
      new Set([...first.items, ...older.items].map((row) => row.key)).size
    ).toBe(25)
    expect(
      statement.sections.find((section) => section.key === "ledger")
    ).toBeUndefined()
    expect(
      legacy.sections.find((section) => section.key === "ledger")?.rows
    ).toHaveLength(4)
    expect(statement.stats).toEqual(legacy.stats)
    expect(exported.content).toContain("T07-0")
    expect(exported.content).not.toContain("T07-3")

    const filter = {
      ...identity,
      category: "savings",
      kind: "statement",
      limit: 1,
    } as const
    const newest = await getMobileMemberActivityPage(filter, prisma)
    const next = await getMobileMemberActivityPage(
      { ...filter, cursor: newest.nextCursor },
      prisma
    )
    expect(newest.nextCursor).toBeTruthy()
    expect(next.nextCursor).toBeNull()
    expect(
      [newest.items[0]?.reference, next.items[0]?.reference].sort()
    ).toEqual(["T07-0", "T07-2"])
    expect(newest.items[0]).toMatchObject({ entryCount: 2, value: 25_000 })
  })

  test("reduces SQL reads on a seeded account", async () => {
    const identity = { tenantId, userId }
    const oldDetail = async () => {
      await getMemberByUserId(identity, prisma)
      return getMemberStatementDetail(tenantId, memberId, prisma)
    }
    const oldStatement = async () =>
      Promise.all([
        oldDetail(),
        getMobileMemberSharesSnapshot(identity, prisma),
      ])
    const history = (kind: "commitments" | "statement") =>
      getMobileMemberActivityPage({ ...identity, kind }, prisma)
    const cases = [
      [
        "Plans",
        () => Promise.all([oldDetail(), history("commitments")]),
        () =>
          Promise.all([
            getMobileMemberCommitments(
              { ...identity, summaryOnly: true },
              prisma
            ),
            history("commitments"),
          ]),
      ],
      [
        "Statement",
        () => Promise.all([oldStatement(), history("statement")]),
        () =>
          Promise.all([
            getMobileMemberStatementSnapshot(
              { ...identity, includeLedger: false },
              prisma
            ),
            history("statement"),
          ]),
      ],
      [
        "Export",
        oldStatement,
        () =>
          createMobileMemberStatementExport(
            { ...identity, tenantSlug },
            prisma
          ),
      ],
    ] as const
    async function measure(read: () => Promise<unknown>) {
      await read()
      const runs = []
      const durations = []
      for (let index = 0; index < 5; index += 1) {
        queries = 0
        const start = performance.now()
        await read()
        durations.push(performance.now() - start)
        runs.push(queries)
      }
      return {
        queries: runs.sort((a, b) => a - b)[2]!,
        ms: Math.round(durations.sort((a, b) => a - b)[2]!),
      }
    }
    for (const [name, before, after] of cases) {
      const baseline = await measure(before)
      const current = await measure(after)
      console.info(
        `${name}: ${baseline.queries} → ${current.queries} SQL, ${baseline.ms} → ${current.ms} ms`
      )
      expect(current.queries).toBeLessThan(baseline.queries)
    }
  }, 15_000)
})
