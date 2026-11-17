import { PrismaPg } from "@prisma/adapter-pg"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { PrismaClient } from "../../generated/prisma/client"
import { normalizePostgresConnectionString } from "../postgres-connection"
import {
  getMobileAdminOperationProfile,
  getTenantOperationProfile,
  updateTenantOperationProfileService,
} from "./operation-profile"

const url = process.env.HALAALVEST_DATABASE_URL
const localUrl =
  url && ["localhost", "127.0.0.1"].includes(new URL(url).hostname) ? url : null
const integration = localUrl ? describe : describe.skip

integration("joined mobile admin operation profile", () => {
  let prisma: PrismaClient
  let tenantId: string
  let otherTenantId: string
  let reads = 0

  class DelayedAdapter extends PrismaPg {
    override async connect() {
      const adapter = await super.connect()
      const query = adapter.queryRaw.bind(adapter)
      adapter.queryRaw = async (args) => {
        reads += 1
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
    const suffix = crypto.randomUUID()
    const tenant = await prisma.tenant.create({
      data: {
        name: "Amana Savings Cooperative",
        slug: `t24-${suffix}`,
        status: "active",
      },
    })
    tenantId = tenant.id
    const otherTenant = await prisma.tenant.create({
      data: {
        name: "Other Cooperative",
        slug: `t24-other-${suffix}`,
        status: "active",
      },
    })
    otherTenantId = otherTenant.id
  })

  afterAll(async () => {
    try {
      await prisma?.tenant.deleteMany({
        where: { id: { in: [tenantId, otherTenantId].filter(Boolean) } },
      })
    } finally {
      await prisma?.$disconnect()
    }
  })

  test("reads defaults without writes, joins review evidence and policy, and stays scoped", async () => {
    reads = 0
    const cold = await getMobileAdminOperationProfile(tenantId, prisma)
    expect(reads).toBe(1)
    expect(cold.services.payment_receipts.accessMode).toBe("office_only")
    expect(cold.reviewedByName).toBeNull()
    expect(
      await prisma.tenantOperationProfile.count({ where: { tenantId } })
    ).toBe(0)
    expect(
      await prisma.tenantServiceSetting.count({ where: { tenantId } })
    ).toBe(0)

    const reviewer = await prisma.user.create({
      data: {
        email: `reviewer-${tenantId}@example.test`,
        fullName: "Ibrahim Yusuf",
        tenantId,
      },
    })
    await prisma.tenantPolicy.create({
      data: { tenantId, procurementMaximumActiveObligationsPerMember: 3 },
    })
    await updateTenantOperationProfileService(
      {
        actorUserId: reviewer.id,
        expectedAccessMode: "office_only",
        nextAccessMode: "member_self_service",
        serviceKey: "payment_receipts",
        tenantId,
      },
      prisma
    )

    const warm = await getMobileAdminOperationProfile(tenantId, prisma)
    expect(warm.reviewedByName).toBe("Ibrahim Yusuf")
    expect(warm.reviewedByUserId).toBe(reviewer.id)
    expect(warm.reviewedAt).toBeInstanceOf(Date)
    expect(warm.policy.procurementMaximumActiveObligationsPerMember).toBe(3)
    expect(warm.services.payment_receipts.accessMode).toBe(
      "member_self_service"
    )

    const other = await getMobileAdminOperationProfile(otherTenantId, prisma)
    expect(other.reviewedByName).toBeNull()
    expect(other.services.payment_receipts.accessMode).toBe("office_only")
    expect(other.policy.procurementMaximumActiveObligationsPerMember).toBe(1)

    for (const [read, expectedCount] of [
      [getTenantOperationProfile, 3],
      [getMobileAdminOperationProfile, 1],
    ] as const) {
      const times = []
      for (let run = 0; run < 15; run += 1) {
        reads = 0
        const start = performance.now()
        await read(tenantId, prisma)
        times.push(performance.now() - start)
        expect(reads).toBe(expectedCount)
      }
      times.sort((a, b) => a - b)
      console.log(
        `T24 profile: ${expectedCount} SQL, median ${times[7]?.toFixed(1)} ms at +5 ms/SQL`
      )
    }
  })
})
