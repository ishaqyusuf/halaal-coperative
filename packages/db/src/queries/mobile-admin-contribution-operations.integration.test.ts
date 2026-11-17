import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import {
  getMobileAdminContributionMemberWorkspace,
  getMobileAdminContributionSummary,
  getMobileAdminContributionWorkspace,
  mobileAdminContributionPageSize,
} from "./mobile-admin-contribution-operations"

/**
 * T18 mobile admin contributions: cursor paging on every lane, batch totals
 * computed on the server without loading rows, and the summary split from
 * the lane pages (older builds still get it when includeSummary is omitted).
 */
const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `contrib-it-${crypto.randomUUID().slice(0, 8)}`
const capabilities = {
  manageBatches: true,
  manageMemberContributions: true,
  view: true,
}
const tenants: string[] = []
const users: string[] = []
let tenantId = ""
let otherTenantId = ""
let firstMemberId = ""

async function seedTenant(suffix: string, members: number) {
  const tenant = await db!.tenant.create({
    data: { name: `Contrib ${suffix}`, slug: `${slug}-${suffix}`, status: "active" },
  })
  tenants.push(tenant.id)
  const user = await db!.user.create({
    data: {
      email: `${slug}-${suffix}@example.test`,
      fullName: `Admin ${suffix}`,
      passwordHash: "test-only",
      tenantId: tenant.id,
    },
  })
  users.push(user.id)
  const source = await (db as any).deductionSource.create({
    data: { name: `Kano payroll ${suffix}`, tenantId: tenant.id, type: "employer_payroll" },
  })
  await db!.member.createMany({
    data: Array.from({ length: members }, (_, index) => ({
      fullName: `Member ${suffix} ${String(index).padStart(3, "0")}`,
      joinedAt: new Date("2026-01-01T00:00:00.000Z"),
      memberNumber: `QHC-${suffix}-${index}`,
      memberType: "individual" as const,
      tenantId: tenant.id,
    })),
  })
  const ids = await db!.member.findMany({
    orderBy: { fullName: "asc" },
    select: { id: true },
    where: { tenantId: tenant.id },
  })
  await db!.contribution.createMany({
    data: ids.map((member, index) => ({
      amount: 25000,
      channel: "payroll" as const,
      memberId: member.id,
      postedAt: new Date(Date.UTC(2026, 10, 1, 0, index)),
      reference: `KSP-${suffix}-${index}`,
      status: "posted" as const,
      tenantId: tenant.id,
    })),
  })
  for (let month = 1; month <= 3; month += 1) {
    const batch = await (db as any).collectionSourceContributionBatch.create({
      data: {
        createdByUserId: user.id,
        deductionSourceId: source.id,
        periodLabel: `2026-0${month}`,
        periodMonth: month,
        periodYear: 2026,
        tenantId: tenant.id,
      },
    })
    await (db as any).collectionSourceContributionBatchRow.createMany({
      data: ids.slice(0, 5).map((member, index) => ({
        batchId: batch.id,
        expectedAmount: 20000,
        memberId: member.id,
        paidAmount: index < 3 ? 20000 : 0,
        status: index < 2 ? "posted" : index === 2 ? "collected" : "exception",
        tenantId: tenant.id,
      })),
    })
  }
  return { firstMemberId: ids[0]!.id, tenantId: tenant.id }
}

run("mobile admin contribution reads", () => {
  beforeAll(async () => {
    const own = await seedTenant("a", mobileAdminContributionPageSize + 5)
    tenantId = own.tenantId
    firstMemberId = own.firstMemberId
    otherTenantId = (await seedTenant("b", 3)).tenantId
  })

  afterAll(async () => {
    await db!.tenant.deleteMany({ where: { id: { in: tenants } } })
    await db!.user.deleteMany({ where: { id: { in: users } } })
  })

  it("pages commitments and the ledger with cursors and no repeats", async () => {
    for (const lane of ["commitments", "ledger"] as const) {
      const first = await getMobileAdminContributionWorkspace({
        capabilities,
        includeSummary: false,
        lane,
        tenantId,
      })
      expect(first.data).toHaveLength(mobileAdminContributionPageSize)
      expect(first.nextCursor).toBeTruthy()
      expect("stats" in first).toBe(false)
      const second = await getMobileAdminContributionWorkspace({
        capabilities,
        cursor: first.nextCursor,
        includeSummary: false,
        lane,
        tenantId,
      })
      expect(second.data).toHaveLength(5)
      expect(second.nextCursor).toBeNull()
      const ids = new Set([...first.data, ...second.data].map((row) => row.id))
      expect(ids.size).toBe(mobileAdminContributionPageSize + 5)
    }
  })

  it("totals collection batches on the server for this tenant only", async () => {
    const page = await getMobileAdminContributionWorkspace({
      capabilities,
      includeSummary: false,
      lane: "collections",
      tenantId,
    })
    expect(page.data).toHaveLength(3)
    expect((page.data[0] as any).periodMonth).toBe(3)
    expect((page.data[0] as any).totals).toEqual({
      blockedRows: 0,
      collectedRows: 1,
      exceptionRows: 2,
      expectedAmount: 100000,
      paidAmount: 60000,
      postedAmount: 40000,
      postedRows: 2,
      rowCount: 5,
      skippedRows: 0,
      stagedRows: 0,
    })
    const search = await getMobileAdminContributionWorkspace({
      capabilities,
      includeSummary: false,
      lane: "collections",
      search: "2026-02",
      tenantId,
    })
    expect(search.data).toHaveLength(1)
    const other = await getMobileAdminContributionWorkspace({
      capabilities,
      includeSummary: false,
      lane: "collections",
      search: "Kano payroll b",
      tenantId,
    })
    expect(other.data).toHaveLength(0)
  })

  it("keeps the summary on lane pages for older builds", async () => {
    const legacy = await getMobileAdminContributionWorkspace({
      capabilities,
      lane: "collections",
      tenantId,
    })
    const summary = await getMobileAdminContributionSummary({
      capabilities,
      tenantId,
    })
    expect(legacy.stats).toEqual(summary.stats)
    expect(legacy.sources).toEqual(summary.sources)
    expect(summary.stats.members).toBe(mobileAdminContributionPageSize + 5)
    expect(summary.stats.exceptions).toBe(6)
    const otherSummary = await getMobileAdminContributionSummary({
      capabilities,
      tenantId: otherTenantId,
    })
    expect(otherSummary.stats.members).toBe(3)
  })

  it("returns references on the member's contribution history", async () => {
    const member = await getMobileAdminContributionMemberWorkspace({
      memberId: firstMemberId,
      tenantId,
    })
    expect(member.contributionHistory[0]).toMatchObject({
      channel: "payroll",
      reference: "KSP-a-0",
    })
  })
})
