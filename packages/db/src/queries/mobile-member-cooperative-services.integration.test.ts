import { PrismaPg } from "@prisma/adapter-pg"
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { PrismaClient } from "../../generated/prisma/client"
import { normalizePostgresConnectionString } from "../postgres-connection"
import {
  getMobileMemberFoodPurchaseApplicationPage,
  getMobileMemberFoodPurchaseService,
  getMobileMemberProcurementRequestPage,
  getMobileMemberProcurementService,
  getMobileMemberProjectFinancingRequestPage,
  getMobileMemberProjectFinancingService,
} from "./mobile-member-cooperative-services"

const url = process.env.HALAALVEST_DATABASE_URL
const localUrl =
  url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname) ? url : null
const integration = localUrl ? describe : describe.skip

integration("member service history on Postgres", () => {
  let prisma: PrismaClient
  let tenantId: string
  let userId: string
  let otherUserId: string
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
    const nonce = crypto.randomUUID().slice(0, 8)
    const tenant = await prisma.tenant.create({
      data: {
        name: "Member requests integration",
        slug: `service-requests-${nonce}`,
        status: "active",
      },
    })
    tenantId = tenant.id
    const addMember = async (name: string, memberNumber: string) => {
      const user = await prisma.user.create({
        data: {
          email: `${memberNumber}-${nonce}@example.test`,
          fullName: name,
          tenantId,
        },
      })
      const member = await prisma.member.create({
        data: {
          tenantId,
          userId: user.id,
          fullName: name,
          memberNumber,
          memberType: "individual",
          joinedAt: new Date("2024-01-15"),
        },
      })
      return { memberId: member.id, userId: user.id }
    }
    const member = await addMember("Aisha Bello", "QHC-0042")
    const other = await addMember("Ibrahim Yusuf", "QHC-0043")
    userId = member.userId
    otherUserId = other.userId
    const cycle = await prisma.foodPurchaseCycle.create({
      data: {
        tenantId,
        releasedByUserId: userId,
        periodMonth: new Date("2026-10-01"),
        releasedAmount: 1000000,
        releasedAt: new Date("2026-10-01"),
        status: "open",
      },
    })
    const releasedCycle = await prisma.foodPurchaseCycle.create({
      data: {
        tenantId,
        releasedByUserId: userId,
        periodMonth: new Date("2026-09-01"),
        releasedAmount: 1000000,
        releasedAt: new Date("2026-09-01"),
        status: "accounting_approved",
      },
    })
    const rows = Array.from({ length: 23 }, (_, index) => ({
      createdByUserId: userId,
      memberId: member.memberId,
      requestedAt: new Date(Date.UTC(2026, 9, 30 - index)),
      status: index === 22 ? ("active" as const) : ("submitted" as const),
      tenantId,
    }))
    await prisma.procurementRequest.createMany({
      data: [
        ...rows.map((row, index) => ({
          ...row,
          estimatedMonthlyRepayment: 25000,
          itemName: index === 22 ? "Sewing machine" : `Chest freezer ${index}`,
          requestedCost: 100000,
          requestedRepaymentMonths: 4,
        })),
        {
          ...rows[22]!,
          itemName: "Other sewing machine",
          memberId: other.memberId,
          estimatedMonthlyRepayment: 25000,
          requestedCost: 100000,
          requestedRepaymentMonths: 4,
        },
      ],
    })
    await prisma.projectFinancingRequest.createMany({
      data: rows.map((row, index) => ({
        ...row,
        businessName: `Bello project ${index}`,
        requestedAmount: 200000,
      })),
    })
    await prisma.foodPurchaseApplication.createMany({
      data: [
        {
          tenantId,
          memberId: member.memberId,
          cycleId: cycle.id,
          submittedByUserId: userId,
          requestedAt: new Date("2026-10-10"),
          requestedAmount: 100000,
          itemDescription: "Rice and beans",
          status: "submitted",
        },
        {
          tenantId,
          memberId: member.memberId,
          cycleId: releasedCycle.id,
          submittedByUserId: userId,
          requestedAt: new Date("2026-09-05"),
          requestedAmount: 100000,
          approvedAmount: 100000,
          paidAmount: 25000,
          itemDescription: "Rice and oil",
          status: "approved",
        },
        {
          tenantId,
          memberId: member.memberId,
          cycleId: releasedCycle.id,
          submittedByUserId: userId,
          requestedAt: new Date("2026-09-01"),
          requestedAmount: 120000,
          approvedAmount: 120000,
          paidAmount: 120000,
          itemDescription: "Paid beans",
          status: "approved",
        },
      ],
    })
  })

  afterAll(async () => {
    try {
      if (tenantId) await prisma.tenant.delete({ where: { id: tenantId } })
    } finally {
      await prisma?.$disconnect()
    }
  })

  async function measure<T>(read: () => Promise<T>) {
    const samples: number[] = []
    let result!: T
    for (let run = 0; run < 5; run++) {
      reads = 0
      const start = performance.now()
      result = await read()
      samples.push(performance.now() - start)
    }
    return {
      result,
      reads,
      median: samples.sort((a, b) => a - b)[2]!.toFixed(1),
    }
  }

  test("server paging preserves complete summaries and member ownership", async () => {
    const input = { tenantId, userId }
    const procurement = await measure(() =>
      getMobileMemberProcurementService(input, prisma)
    )
    const project = await measure(() =>
      getMobileMemberProjectFinancingService(input, prisma)
    )
    const food = await measure(() =>
      getMobileMemberFoodPurchaseService(input, prisma)
    )
    expect(procurement.result.summary).toMatchObject({
      activeRequests: 1,
      totalRequests: 23,
    })
    expect(procurement.result.requests).toHaveLength(20)
    expect(procurement.result.activeRequest?.itemName).toBe("Sewing machine")
    expect(project.result.summary).toMatchObject({
      activeRequests: 1,
      totalRequests: 23,
    })
    expect(project.result.requests).toHaveLength(20)
    expect(project.result.activeRequest?.businessName).toBe("Bello project 22")
    expect(food.result.cycles).toHaveLength(2)
    expect(food.result.summary).toMatchObject({
      openCycles: 1,
      totalApplications: 3,
    })
    const second = await getMobileMemberProcurementRequestPage(
      { ...input, cursor: procurement.result.requestNextCursor },
      prisma
    )
    expect(second.data).toHaveLength(3)
    expect(second.nextCursor).toBeNull()
    const filtered = await getMobileMemberProcurementRequestPage(
      { ...input, filter: "active", search: "SEWING" },
      prisma
    )
    expect(filtered.data.map((row) => row.itemName)).toEqual(["Sewing machine"])
    const projectFiltered = await getMobileMemberProjectFinancingRequestPage(
      { ...input, filter: "active" },
      prisma
    )
    expect(projectFiltered.data.map((row) => row.businessName)).toEqual([
      "Bello project 22",
    ])
    const foodActive = await getMobileMemberFoodPurchaseApplicationPage(
      { ...input, filter: "active" },
      prisma
    )
    const foodClosed = await getMobileMemberFoodPurchaseApplicationPage(
      { ...input, filter: "closed" },
      prisma
    )
    expect(foodActive.data.map((row) => row.itemDescription)).toEqual([
      "Rice and oil",
    ])
    expect(foodClosed.data.map((row) => row.itemDescription)).toEqual([
      "Paid beans",
    ])
    expect(
      (
        await getMobileMemberFoodPurchaseApplicationPage(
          { tenantId, userId: otherUserId },
          prisma
        )
      ).data
    ).toEqual([])
    console.log(
      `T16 list SQL at +5ms/query: procurement ${procurement.reads} reads/${procurement.median}ms; project ${project.reads}/${project.median}ms; food ${food.reads}/${food.median}ms`
    )
  })
})
