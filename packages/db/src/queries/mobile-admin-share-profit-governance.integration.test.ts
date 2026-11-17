import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import {
  getMobileAdminProfitPeriodDetail,
  getMobileAdminShareProfitSummary,
  getMobileAdminShareProfitWorkspace,
} from "./mobile-admin-share-profit-governance"

/**
 * T22 mobile shares and profit: allocation totals come from a grouped
 * aggregate (so an entry with more than 30 allocations still reconciles in
 * the period detail), and the summary is read once instead of per book.
 */
const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const nonce = crypto.randomUUID().slice(0, 8)
const capabilities = {
  approveProfit: true,
  publishProfit: true,
  reviewShares: true,
  view: true,
}
let tenantId = ""
let periodId = ""
const allocationCount = 35

run("mobile admin shares and profit reads", () => {
  beforeAll(async () => {
    const tenant = await db!.tenant.create({
      data: {
        name: `Shares ${nonce}`,
        slug: `shares-it-${nonce}`,
        status: "active",
      },
    })
    tenantId = tenant.id
    await db!.member.createMany({
      data: Array.from({ length: allocationCount }, (_, index) => ({
        fullName: `Member ${index}`,
        joinedAt: new Date("2026-01-01T00:00:00.000Z"),
        memberNumber: `QHC-${index}`,
        memberType: "individual" as const,
        tenantId,
      })),
    })
    const members = await db!.member.findMany({
      select: { id: true },
      where: { tenantId },
    })
    const period = await db!.dividendPeriod.create({
      data: {
        distributableAmount: 3_500,
        name: "Q3 2026",
        periodEnd: new Date("2026-09-30T00:00:00.000Z"),
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        status: "approved",
        tenantId,
        totalProfitAmount: 3_500,
      },
    })
    periodId = period.id
    const business = await db!.shareBusiness.create({
      data: {
        capitalAmount: 100_000,
        name: "Amana Agro Ventures",
        profitAmount: 3_500,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        tenantId,
      },
    })
    const entry = await db!.shareBusinessProfitEntry.create({
      data: {
        allocatableProfitAmount: 3_500,
        linkedDividendPeriodId: period.id,
        profitAmount: 3_500,
        profitDate: new Date("2026-09-30T00:00:00.000Z"),
        shareBusinessId: business.id,
        status: "reviewed",
        tenantId,
      },
    })
    await db!.shareProfitAllocation.createMany({
      data: members.map((member) => ({
        allocatedProfitAmount: 100,
        memberId: member.id,
        memberShareBalance: 1_000,
        profitEntryId: entry.id,
        sharePercentage: 1 / allocationCount,
        tenantId,
        totalShareBalance: 1_000 * allocationCount,
      })),
    })
  })

  afterAll(async () => {
    await db!.tenant.deleteMany({ where: { id: tenantId } })
  })

  it("reconciles an entry with more than 30 allocations in the period detail", async () => {
    const detail = await getMobileAdminProfitPeriodDetail({
      capabilities,
      dividendPeriodId: periodId,
      tenantId,
    })
    expect(detail.profitEntries[0]).toMatchObject({
      allocatedAmount: 3_500,
      allocationCount,
      allocationsReconcile: true,
      allowedActions: ["approve"],
    })
    expect(detail.profitEntries[0]!.allocations).toHaveLength(30)
  })

  it("pages the profit book without stats and reads them once in the summary", async () => {
    const page = await getMobileAdminShareProfitWorkspace({
      book: "profit",
      capabilities,
      includeSummary: false,
      tenantId,
    })
    expect(page.profit && "summary" in page.profit).toBe(false)
    expect(page.profit?.periods[0]?.entries[0]).toMatchObject({
      allocationCount,
      allocationsReconcile: true,
    })
    const summary = await getMobileAdminShareProfitSummary({
      capabilities,
      tenantId,
    })
    expect(summary.profit).toEqual({
      pendingApprovalCount: 1,
      readyToPublishCount: 0,
      unpublishedAmount: 3_500,
    })
    expect(summary.shares.pendingCount).toBe(0)
  })
})
