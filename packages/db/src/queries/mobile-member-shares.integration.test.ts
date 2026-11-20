import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../generated/prisma/client"
import { normalizePostgresConnectionString } from "../postgres-connection"
import { getMobileMemberActivityPage } from "./mobile-member-activity"
import {
  getMobileMemberShareOverview,
  getMobileMemberShareProfitPeriods,
  getMobileMemberSharesSnapshot,
  getMobileMemberShareTimelinePage,
} from "./mobile-member-shares"
import { cancelOwnMemberShareApplication } from "./tenant-finance"

const databaseUrl = process.env.HALAALVEST_DATABASE_URL
const localUrl =
  databaseUrl &&
  ["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
    ? databaseUrl
    : undefined
const runIntegration = localUrl ? describe : describe.skip

runIntegration("mobile shares overview", () => {
  let prisma: PrismaClient
  let tenantId: string
  let memberId: string
  let userId: string
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

  const date = new Date("2026-06-15T00:00:00.000Z")
  const prior = new Date("2026-01-01T00:00:00.000Z")

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new DelayedAdapter({
        connectionString: normalizePostgresConnectionString(localUrl!),
      }),
    })
    const nonce = crypto.randomUUID().slice(0, 8)
    const tenant = await prisma.tenant.create({
      data: {
        name: "Share cooperative",
        slug: `t08-shares-${nonce}`,
        status: "active",
      },
    })
    tenantId = tenant.id
    await prisma.tenantPolicy.create({
      data: {
        compulsoryShareUnits: 12,
        maximumShareUnits: 20,
        shareConfigurationMode: "unit_based",
        shareUnitAmount: 25_000,
        tenantId,
      },
    })
    const user = await prisma.user.create({
      data: {
        email: `${nonce}@example.test`,
        fullName: "Aisha Bello",
        tenantId,
      },
    })
    userId = user.id
    const [member, other] = await Promise.all([
      prisma.member.create({
        data: {
          fullName: user.fullName,
          joinedAt: prior,
          memberNumber: "QHC-0042",
          memberType: "individual",
          tenantId,
          userId,
        },
      }),
      prisma.member.create({
        data: {
          fullName: "Other member",
          joinedAt: prior,
          memberNumber: "QHC-0043",
          memberType: "individual",
          tenantId,
        },
      }),
    ])
    memberId = member.id
    await prisma.memberShareApplication.createMany({
      data: Array.from({ length: 23 }, (_, index) => ({
        approvedUnits: index === 1 ? 3 : null,
        createdAt: date,
        memberId: index === 22 ? other.id : member.id,
        requestedUnits: index === 1 ? 3 : 2,
        shareValueSnapshot: index === 1 ? 75_000 : 50_000,
        status:
          index === 0 ? "pending" : index === 1 ? "approved" : "cancelled",
        tenantId,
        unitAmountSnapshot: 25_000,
      })),
    })
    await prisma.memberShareLedgerEntry.createMany({
      data: [
        {
          amount: 75_000,
          effectiveDate: date,
          memberId,
          notes: "Approved units",
          sourceType: "share_application",
          tenantId,
        },
        {
          amount: 100_000,
          effectiveDate: prior,
          memberId,
          notes: "Opening capital",
          sourceType: "backfill",
          tenantId,
        },
        {
          amount: 99,
          effectiveDate: date,
          memberId: other.id,
          notes: "Other member",
          sourceType: "backfill",
          tenantId,
        },
        {
          amount: 99,
          effectiveDate: new Date("2099-01-01"),
          memberId,
          notes: "Future movement",
          sourceType: "backfill",
          tenantId,
        },
      ],
    })
    for (const status of ["published", "draft"] as const) {
      await prisma.dividendPeriod.create({
        data: {
          tenantId,
          name: status,
          periodStart: prior,
          periodEnd: date,
          totalProfitAmount: 20_000,
          distributableAmount: 20_000,
          status,
          publishedAt: status === "published" ? date : null,
          allocations: {
            create: [
              {
                tenantId,
                memberId,
                allocationAmount: 12_400,
                savingsBasisAmount: 175_000,
              },
              {
                tenantId,
                memberId: other.id,
                allocationAmount: 7_600,
                savingsBasisAmount: 100_000,
              },
            ],
          },
        },
      })
    }
  })

  afterAll(async () => {
    if (tenantId) {
      await prisma.user.deleteMany({ where: { tenantId } })
      await prisma.tenant.delete({ where: { id: tenantId } })
    }
    await prisma?.$disconnect()
  })

  test("returns the approved position, published total and stable mixed pages in seven reads", async () => {
    const identity = { tenantId, userId }
    const medians = new Map()
    for (const [name, read] of [
      ["legacy list", () => getMobileMemberSharesSnapshot(identity, prisma)],
      [
        "legacy activity",
        () =>
          getMobileMemberActivityPage({ ...identity, kind: "shares" }, prisma),
      ],
      ["overview", () => getMobileMemberShareOverview(identity, prisma)],
    ] as const) {
      const samples: number[] = []
      for (let run = 0; run < 15; run++) {
        queries = 0
        const start = performance.now()
        await read()
        samples.push(performance.now() - start)
      }
      const median = samples.sort((a, b) => a - b)[7]!
      medians.set(name, { queries, median })
      console.log(
        `${name}: ${queries} SQL reads, ${median.toFixed(1)} ms median with 5 ms per query`
      )
    }
    expect(medians.get("overview").queries).toBe(7)

    const overview = await getMobileMemberShareOverview(identity, prisma)
    expect(overview.position).toMatchObject({
      approvedOptionalUnits: 3,
      remainingOptionalUnits: 3,
      pendingOptionalUnits: 2,
      totalApprovedUnits: 15,
    })
    expect(overview.profit).toEqual({
      count: 1,
      total: 12_400,
      latestUnpaidAmount: 12_400,
    })
    expect(overview.timeline.items.map((item) => item.kind)).toEqual(
      Array(20).fill("request")
    )
    expect(overview.timeline.nextCursor).toBeTruthy()
    const second = await getMobileMemberShareTimelinePage(
      {
        ...identity,
        cursor: overview.timeline.nextCursor!,
      },
      prisma
    )
    expect(second.items.map((item) => item.kind)).toEqual([
      "request",
      "request",
      "ledger",
      "ledger",
    ])
    expect(second.nextCursor).toBeNull()
    const items = [...overview.timeline.items, ...second.items]
    expect(
      new Set(
        items.map((item) =>
          item.kind === "request" ? item.application.id : item.id
        )
      ).size
    ).toBe(24)
    expect(
      second.items.flatMap((item) =>
        item.kind === "ledger" ? [item.label] : []
      )
    ).toEqual(["Approved units", "Opening capital"])

    const periods = await getMobileMemberShareProfitPeriods(identity, prisma)
    expect(
      periods.map(({ name, amount, payout }) => ({ name, amount, payout }))
    ).toEqual([{ amount: 12_400, name: "published", payout: null }])
    expect(
      await getMobileMemberShareOverview(
        { tenantId: crypto.randomUUID(), userId },
        prisma
      )
    ).toMatchObject({
      member: null,
      state: "member_profile_missing",
    })
  })

  test("lets a member cancel only their own pending share request", async () => {
    const request = await prisma.memberShareApplication.create({
      data: {
        memberId,
        requestedUnits: 4,
        shareValueSnapshot: 100_000,
        status: "pending",
        tenantId,
        unitAmountSnapshot: 25_000,
      },
    })
    const identity = {
      actorUserId: userId,
      applicationId: request.id,
      memberId,
      tenantId,
    }

    // Another member cannot see, let alone cancel, this request.
    await expect(
      cancelOwnMemberShareApplication(
        { ...identity, memberId: crypto.randomUUID() },
        prisma
      )
    ).rejects.toThrow("Share request was not found.")

    const cancelled = await cancelOwnMemberShareApplication(identity, prisma)
    expect(cancelled.status).toBe("cancelled")
    expect(cancelled.reviewedAt).toBeNull()

    await expect(
      cancelOwnMemberShareApplication(identity, prisma)
    ).rejects.toThrow("already cancelled")

    const reviewed = await prisma.memberShareApplication.create({
      data: {
        memberId,
        requestedUnits: 1,
        shareValueSnapshot: 25_000,
        status: "rejected",
        tenantId,
        unitAmountSnapshot: 25_000,
      },
    })
    await expect(
      cancelOwnMemberShareApplication(
        { ...identity, applicationId: reviewed.id },
        prisma
      )
    ).rejects.toThrow("already been reviewed")
    expect(
      (
        await prisma.memberShareApplication.findUnique({
          where: { id: reviewed.id },
        })
      )?.status
    ).toBe("rejected")
  })
})
