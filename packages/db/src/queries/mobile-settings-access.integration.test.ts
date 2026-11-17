import { PrismaPg } from "@prisma/adapter-pg"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { PrismaClient } from "../../generated/prisma/client"
import { normalizePostgresConnectionString } from "../postgres-connection"
import {
  countMobileAdminAccessUsers,
  getMobileAdminAccessOverview,
  getMobileAdminAccessStats,
  listMobileAdminAccessPage,
} from "./mobile-admin-reports-access"
import {
  getMobileMemberFoodPurchaseService,
  getMobileMemberProcurementService,
  getMobileMemberProjectFinancingService,
} from "./mobile-member-cooperative-services"
import { getMobileMemberGuarantorSnapshot } from "./mobile-member-guarantors"
import { getMobileMemberReceiptSnapshot } from "./mobile-member-receipts"
import { getMobileMemberStatementSnapshot } from "./mobile-member-statement"
import { getMobileMemberSupportSnapshot } from "./mobile-member-support"
import { getMobileMemberMore } from "./mobile-settings-access"
import { getTenantOperationProfile } from "./operation-profile"

const url = process.env.HALAALVEST_DATABASE_URL
const localUrl =
  url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname) ? url : null
const integration = localUrl ? describe : describe.skip

integration("mobile settings and workspace access reads", () => {
  const shared = globalThis as typeof globalThis & {
    __halaalVestPrisma?: PrismaClient
  }
  let previousClient: PrismaClient | undefined
  let prisma: PrismaClient
  let tenantId: string
  let otherTenantId: string
  let userId: string
  let sqlReads = 0

  class DelayedAdapter extends PrismaPg {
    override async connect() {
      const adapter = await super.connect()
      const query = adapter.queryRaw.bind(adapter)
      adapter.queryRaw = async (args) => {
        sqlReads += 1
        await Bun.sleep(5)
        return query(args)
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
    previousClient = shared.__halaalVestPrisma
    shared.__halaalVestPrisma = prisma
    const nonce = crypto.randomUUID().slice(0, 8)
    const tenant = await prisma.tenant.create({
      data: {
        name: "More integration",
        slug: `more-${nonce}`,
        status: "active",
      },
    })
    tenantId = tenant.id
    otherTenantId = (
      await prisma.tenant.create({
        data: {
          name: "Other cooperative",
          slug: `other-more-${nonce}`,
          status: "active",
        },
      })
    ).id
    const aisha = await prisma.user.create({
      data: {
        email: `aisha-${nonce}@example.test`,
        fullName: "Aisha Bello",
        tenantId,
      },
    })
    userId = aisha.id
    const admin = await prisma.user.create({
      data: {
        email: `admin-${nonce}@example.test`,
        fullName: "Ibrahim Yusuf",
        tenantId,
      },
    })
    await prisma.user.create({
      data: {
        email: `other-${nonce}@example.test`,
        fullName: "Aisha Other",
        tenantId: otherTenantId,
      },
    })
    await prisma.membership.createMany({
      data: [
        { tenantId, userId, role: "member", isDefault: true },
        { tenantId, userId: admin.id, role: "tenant_admin", isDefault: true },
        { tenantId, userId: admin.id, role: "member" },
      ],
    })
    const member = await prisma.member.create({
      data: {
        tenantId,
        userId,
        fullName: aisha.fullName,
        memberNumber: "QHC-0042",
        memberType: "individual",
        joinedAt: new Date("2024-01-15"),
      },
    })
    await prisma.supportCase.createMany({
      data: [
        {
          tenantId,
          memberId: member.id,
          category: "technical",
          status: "waiting_on_member",
          subject: "Open case",
          description: "Awaiting response",
        },
        {
          tenantId,
          memberId: member.id,
          category: "technical",
          status: "closed",
          subject: "Resolved",
          description: "Completed",
        },
      ],
    })
    await getTenantOperationProfile(tenantId)
  })

  afterAll(async () => {
    try {
      if (tenantId) await prisma.tenant.delete({ where: { id: tenantId } })
      if (otherTenantId)
        await prisma.tenant.delete({ where: { id: otherTenantId } })
    } finally {
      shared.__halaalVestPrisma = previousClient
      await prisma?.$disconnect()
    }
  })

  async function measure<T>(read: () => Promise<T>) {
    const times: number[] = []
    let result!: T
    let reads = 0
    for (let run = 0; run < 5; run++) {
      sqlReads = 0
      const start = performance.now()
      result = await read()
      times.push(performance.now() - start)
      reads = sqlReads
    }
    return { result, reads, median: times.sort((a, b) => a - b)[2]!.toFixed(1) }
  }

  test("matches member work counts without reading the statement or unrelated rows", async () => {
    const input = { tenantId, userId }
    const baseline = await measure(() =>
      Promise.all([
        getMobileMemberStatementSnapshot(input),
        getMobileMemberReceiptSnapshot(input),
        getMobileMemberProcurementService(input),
        getMobileMemberProjectFinancingService(input),
        getMobileMemberFoodPurchaseService(input),
        getMobileMemberGuarantorSnapshot(input),
        getMobileMemberSupportSnapshot(input),
      ])
    )
    const more = await measure(() => getMobileMemberMore(input))
    expect(more.result.member?.memberNumber).toBe("QHC-0042")
    expect(
      more.result.sections.find((section) => section.key === "statement")?.rows
    ).toEqual([])
    expect(
      more.result.sections.find((section) => section.key === "support")?.rows[0]
        ?.value
    ).toBe(baseline.result[6].summary.openCases)
    expect(baseline.result[6].summary.openCases).toBe(1)
    expect(more.reads).toBeLessThan(baseline.reads)
    console.log(
      `member More SQL at +5ms/query: baseline ${baseline.reads}, ${baseline.median}ms; counts ${more.reads}, ${more.median}ms`
    )
    await expect(
      getMobileMemberMore({ tenantId: otherTenantId, userId })
    ).resolves.toMatchObject({ member: null })
  })

  test("pages across group boundaries and filters by tenant and search", async () => {
    const baseline = await measure(() => getMobileAdminAccessOverview(tenantId))
    const count = await measure(() => countMobileAdminAccessUsers(tenantId))
    expect(count.result).toEqual({ workspaceUsers: 2 })
    expect(count.reads).toBe(1)
    console.log(
      `admin More SQL at +5ms/query: baseline ${baseline.reads}, ${baseline.median}ms; count ${count.reads}, ${count.median}ms`
    )
    expect(await getMobileAdminAccessStats(tenantId)).toEqual({
      summary: baseline.result.summary,
      roles: baseline.result.roles,
    })
    const first = await listMobileAdminAccessPage({ tenantId, limit: 1 })
    expect(first.users.map((user) => user.fullName)).toEqual(["Ibrahim Yusuf"])
    expect(first.nextCursor?.group).toBe("staff")
    const second = await listMobileAdminAccessPage({
      tenantId,
      limit: 1,
      cursor: first.nextCursor,
    })
    expect(second.users.map((user) => user.fullName)).toEqual(["Aisha Bello"])
    expect(second.nextCursor).toBeNull()
    const match = await listMobileAdminAccessPage({
      tenantId,
      limit: 25,
      search: "AIsha",
    })
    expect(match.users.map((user) => user.fullName)).toEqual(["Aisha Bello"])
    expect(
      (await listMobileAdminAccessPage({ tenantId, limit: 25, search: "%" }))
        .users
    ).toEqual([])
  })
})
