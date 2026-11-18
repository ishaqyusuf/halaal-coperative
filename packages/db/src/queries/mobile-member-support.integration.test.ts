import { PrismaPg } from "@prisma/adapter-pg"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { PrismaClient } from "../../generated/prisma/client"
import { getMemberByUserId } from "./members"
import {
  createMobileMemberSupportCaseForSession,
  getMobileMemberSupportDetail,
  getMobileMemberSupportSnapshot,
  replyMobileMemberSupportCaseForSession,
} from "./mobile-member-support"
import { getTenantOperationProfile } from "./operation-profile"
import {
  getMemberSupportCaseSummary,
  getSupportCase,
  listSupportCasePage,
} from "./support"

const databaseUrl = process.env.HALAALVEST_DATABASE_URL
const localUrl =
  databaseUrl &&
  ["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)
    ? databaseUrl
    : null

const integration = localUrl ? describe : describe.skip
integration("mobile member support with Postgres", () => {
  const pageSize = 20
  let prisma: PrismaClient
  let tenantId: string
  let userId: string
  let memberId: string
  let latestCaseId: string
  let closedCaseId: string
  let foreignCaseId: string
  let reads = 0

  class DelayedAdapter extends PrismaPg {
    override async connect() {
      const db = await super.connect()
      const query = db.queryRaw.bind(db)
      db.queryRaw = async (args) => {
        if (/^\s*SELECT\b/i.test(args.sql)) reads += 1
        await Bun.sleep(5)
        return query(args)
      }
      return db
    }
  }

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new DelayedAdapter({ connectionString: localUrl! }),
    })
    const nonce = crypto.randomUUID()
    const tenant = await prisma.tenant.create({
      data: { name: "Support integration", slug: `support-${nonce}` },
    })
    tenantId = tenant.id
    const memberUser = await prisma.user.create({
      data: {
        email: `member-${nonce}@example.test`,
        fullName: "Aisha Bello",
        tenantId,
      },
    })
    userId = memberUser.id
    const staff = await prisma.user.create({
      data: {
        email: `staff-${nonce}@example.test`,
        fullName: "Ibrahim Yusuf",
        tenantId,
      },
    })
    const member = await prisma.member.create({
      data: {
        fullName: memberUser.fullName,
        joinedAt: new Date(),
        memberNumber: "QHC-0042",
        memberType: "individual",
        tenantId,
        userId,
      },
    })
    memberId = member.id
    const differentMember = await prisma.member.create({
      data: {
        fullName: "Khadija Sanni",
        joinedAt: new Date(),
        memberNumber: "QHC-0043",
        memberType: "individual",
        tenantId,
      },
    })
    const rows = await prisma.supportCase.createManyAndReturn({
      data: Array.from({ length: 22 }, (_, index) => ({
        category: "payment_issue" as const,
        description: `Support description ${index}`,
        memberId,
        status:
          index === 21
            ? ("waiting_on_member" as const)
            : index === 0
              ? ("closed" as const)
              : ("open" as const),
        subject: `Support case ${index}`,
        tenantId,
        updatedAt: new Date(Date.UTC(2026, 10, index + 1)),
      })),
    })
    latestCaseId = rows.find((row) => row.subject === "Support case 21")!.id
    closedCaseId = rows.find((row) => row.subject === "Support case 0")!.id
    await prisma.supportCaseMessage.createMany({
      data: rows.flatMap(({ id }) =>
        Array.from({ length: 9 }, (_, index) => ({
          authorType: index === 0 ? ("member" as const) : ("staff" as const),
          authorUserId: index === 0 ? userId : staff.id,
          createdAt: new Date(Date.UTC(2026, 9, 12, 10, index)),
          message: `Message ${index}`,
          supportCaseId: id,
          tenantId,
        }))
      ),
    })
    foreignCaseId = (
      await prisma.supportCase.create({
        data: {
          category: "account_update",
          description: "A different member’s case",
          memberId: differentMember.id,
          subject: "Outside member scope",
          tenantId,
        },
      })
    ).id
    await getTenantOperationProfile(tenantId, prisma)
  }, 15_000)

  afterAll(async () => {
    if (tenantId) await prisma.tenant.delete({ where: { id: tenantId } })
    await prisma?.$disconnect()
  })

  async function measure<T>(name: string, query: () => Promise<T>) {
    const durations = []
    let result!: T
    let count = 0
    for (let trial = 0; trial < 5; trial += 1) {
      reads = 0
      const start = performance.now()
      result = await query()
      count = reads
      durations.push(performance.now() - start)
    }
    console.log(
      `${name}: ${count} SELECTs, ${durations.sort((a, b) => a - b)[2].toFixed(1)} ms median (+5 ms per query)`
    )
    return { result, count }
  }

  test("bounds previews, preserves membership and measures default and cursor pages", async () => {
    const oldList = async (cursor?: string | null) => {
      await getMemberByUserId({ tenantId, userId }, prisma)
      return Promise.all([
        listSupportCasePage({ tenantId, memberId, pageSize, cursor }, prisma),
        getMemberSupportCaseSummary({ tenantId, memberId }, prisma),
        getTenantOperationProfile(tenantId, prisma),
      ])
    }
    const baseline = await measure("previous first page", () => oldList())
    const first = await measure("current first page", () =>
      getMobileMemberSupportSnapshot({ tenantId, userId }, prisma)
    )
    expect(first.count).toBeLessThan(baseline.count)
    expect(first.result.summary).toMatchObject({
      totalCases: 22,
      openCases: 21,
    })
    expect(first.result.cases).toHaveLength(20)
    expect(first.result.cases[0]).toMatchObject({
      id: latestCaseId,
      messageCount: 9,
      detail: "Message 8",
      status: "waiting_on_member",
    })
    expect(
      first.result.cases[0]?.recentMessages.map((item) => item.message)
    ).toEqual(["Message 4", "Message 5", "Message 6", "Message 7", "Message 8"])
    expect(first.result.cases[0]?.recentMessages[4]?.authorName).toBe(
      "Ibrahim Yusuf"
    )
    const cursor = first.result.nextCursor!
    const pastNext = await measure("previous cursor page", () =>
      oldList(cursor)
    )
    const next = await measure("current cursor page", () =>
      getMobileMemberSupportSnapshot(
        { tenantId, userId, cursor, includeOverview: false },
        prisma
      )
    )
    expect(next.count).toBe(3)
    expect(next.count).toBeLessThan(pastNext.count)
    expect(next.result.cases).toHaveLength(2)
    expect(next.result.cases.some((item) => item.id === closedCaseId)).toBe(
      true
    )
    expect(next.result.nextCursor).toBeNull()
    expect(first.result.cases.some((item) => item.id === foreignCaseId)).toBe(
      false
    )
    const legacy = await getMobileMemberSupportSnapshot(
      { tenantId, userId, cursor },
      prisma
    )
    expect(legacy.summary).toEqual(first.result.summary)
    expect(legacy.canCreateCase).toBe(first.result.canCreateCase)
  }, 10_000)

  test("reads the full scoped thread and returns the committed thread after a reply", async () => {
    const input = { tenantId, userId, supportCaseId: latestCaseId }
    const previous = await measure("previous detail", async () => {
      await getMemberByUserId(input, prisma)
      return getSupportCase({ ...input, memberId }, prisma)
    })
    const current = await measure("current detail", () =>
      getMobileMemberSupportDetail(input, prisma)
    )
    expect(current.count).toBe(3)
    expect(current.count).toBeLessThan(previous.count)
    expect(current.result.recentMessages).toHaveLength(9)
    await expect(
      getMobileMemberSupportDetail(
        { ...input, supportCaseId: foreignCaseId },
        prisma
      )
    ).rejects.toThrow("Support case was not found")
    await expect(
      replyMobileMemberSupportCaseForSession(
        { ...input, supportCaseId: closedCaseId, message: "Closed" },
        prisma
      )
    ).rejects.toThrow("Closed support cases")
    const reply = await replyMobileMemberSupportCaseForSession(
      { ...input, message: "Thank you, Ibrahim." },
      prisma
    )
    expect(reply.status).toBe("waiting_on_member")
    expect(reply.messageCount).toBe(10)
    expect(reply.recentMessages.at(-1)).toMatchObject({
      authorName: "Aisha Bello",
      authorType: "member",
      message: "Thank you, Ibrahim.",
    })
    const created = await createMobileMemberSupportCaseForSession(
      {
        category: "account_update",
        description: "Please update my contact details.",
        subject: "Contact details",
        tenantId,
        userId,
      },
      prisma
    )
    expect(created.recentMessages.at(-1)).toMatchObject({
      authorName: "Aisha Bello",
      authorType: "member",
    })
    expect(created.messageCount).toBe(1)
  }, 10_000)
})
