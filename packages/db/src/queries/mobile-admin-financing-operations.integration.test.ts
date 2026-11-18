import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import {
  getMobileAdminFinancingItem,
  getMobileAdminFinancingOperationsWorkspace,
  getMobileAdminFinancingSummary,
} from "./mobile-admin-financing-operations"

/**
 * T20 mobile financing operations: the summary carries cycle health and
 * lane counts once, lane pages skip it, the quick-financing blocker only
 * looks at this page's members, and a deep link reads one record.
 */
const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const nonce = crypto.randomUUID().slice(0, 8)
const capabilities = { disburse: true, manageCycle: true, review: true, view: true }
const tenants: string[] = []
const users: string[] = []
let tenantId = ""
let otherTenantId = ""
let reviewRequestId = ""
let approvedLoanId = ""

async function seedTenant(suffix: string) {
  const tenant = await db!.tenant.create({
    data: { name: `Financing ${suffix}`, slug: `fin-it-${nonce}-${suffix}`, status: "active" },
  })
  tenants.push(tenant.id)
  const user = await db!.user.create({
    data: { email: `fin-${nonce}-${suffix}@example.test`, fullName: "Finance Officer", tenantId: tenant.id },
  })
  users.push(user.id)
  const member = (name: string, number: string) =>
    db!.member.create({
      data: {
        fullName: name,
        joinedAt: new Date("2026-01-01T00:00:00.000Z"),
        memberNumber: number,
        memberType: "individual",
        tenantId: tenant.id,
      },
    })
  const aisha = await member("Aisha Bello", "QHC-0042")
  const ibrahim = await member("Ibrahim Yusuf", "QHC-0007")
  const quick = await db!.loanProduct.create({
    data: { loanType: "quick", maxSavingsMultiple: 2, name: "Quick", tenantId: tenant.id, termMonths: 6 },
  })
  const normal = await db!.loanProduct.create({
    data: { loanType: "normal", maxSavingsMultiple: 2, name: "Asset", tenantId: tenant.id, termMonths: 12 },
  })
  const base = {
    availablePoolSnapshot: 5_000_000,
    createdByUserId: user.id,
    eligibleAmountSnapshot: 1_000_000,
    estimatedMonthlyServicing: 50_000,
    requestedTermMonths: 6,
    tenantId: tenant.id,
  }
  const at = (minutes: number) => new Date(Date.now() - minutes * 60_000)
  const review = await db!.loanRequest.create({
    data: { ...base, loanProductId: quick.id, memberId: ibrahim.id, requestedAmount: 150_000, requestedAt: at(30) },
  })
  await db!.loanRequest.create({
    data: { ...base, loanProductId: normal.id, memberId: aisha.id, requestedAmount: 600_000, requestedAt: at(20), status: "under_review" },
  })
  const approvedRequest = await db!.loanRequest.create({
    data: { ...base, loanProductId: normal.id, memberId: ibrahim.id, requestedAmount: 400_000, requestedAt: at(60), status: "approved" },
  })
  const loan = await db!.loan.create({
    data: {
      estimatedMonthlyServicing: 40_000,
      loanProductId: normal.id,
      loanRequestId: approvedRequest.id,
      memberId: ibrahim.id,
      outstandingPrincipal: 400_000,
      principalAmount: 400_000,
      status: "approved",
      tenantId: tenant.id,
      termMonths: 12,
    },
  })
  return { loanId: loan.id, reviewRequestId: review.id, tenantId: tenant.id }
}

run("mobile admin financing operations reads", () => {
  beforeAll(async () => {
    const own = await seedTenant("a")
    tenantId = own.tenantId
    reviewRequestId = own.reviewRequestId
    approvedLoanId = own.loanId
    otherTenantId = (await seedTenant("b")).tenantId
  })

  afterAll(async () => {
    await db!.tenant.deleteMany({ where: { id: { in: tenants } } })
    await db!.user.deleteMany({ where: { id: { in: users } } })
  })

  it("counts each lane on the server, once, for this tenant", async () => {
    const summary = await getMobileAdminFinancingSummary({ capabilities, tenantId })
    expect(summary.lanes).toEqual({
      disbursement: { count: 1, totalAmount: 400_000 },
      review: { count: 2, totalAmount: 750_000 },
    })
    expect(summary.cycle.totalCapacityAmount).toBeGreaterThanOrEqual(0)
  })

  it("pages a lane without the cycle and keeps the quick-financing blocker", async () => {
    const page = await getMobileAdminFinancingOperationsWorkspace({
      capabilities,
      includeSummary: false,
      lane: "review",
      tenantId,
    })
    expect("cycle" in page).toBe(false)
    expect(page.items.map((item) => item.member.name)).toEqual(["Ibrahim Yusuf", "Aisha Bello"])
    expect(page.items[0]!.blockers).toContain(
      "The member has active financing that blocks quick financing."
    )
    expect(page.items[1]!.blockers).not.toContain(
      "The member has active financing that blocks quick financing."
    )
    const legacy = await getMobileAdminFinancingOperationsWorkspace({ capabilities, lane: "review", tenantId })
    expect(legacy.cycle).toBeDefined()
  })

  it("opens one record for a deep link and never another tenant's", async () => {
    const loan = await getMobileAdminFinancingItem({ capabilities, entityId: approvedLoanId, tenantId })
    expect(loan.lane).toBe("disbursement")
    expect(loan.item.actions).toEqual(["disburse"])
    const request = await getMobileAdminFinancingItem({ capabilities, entityId: reviewRequestId, tenantId })
    expect(request.lane).toBe("review")
    await expect(
      getMobileAdminFinancingItem({ capabilities, entityId: approvedLoanId, tenantId: otherTenantId })
    ).rejects.toThrow("Financing record not found.")
  })
})
