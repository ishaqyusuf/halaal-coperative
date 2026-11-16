import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import { transitionFoodPurchaseCycle } from "./food-purchase"
import { ensureTenantLedgerAccounts } from "./ledger"
import {
  memberPurchaseSalesBusinessKey,
  postMemberPurchaseRelease,
  procurementReleaseInput,
} from "./member-purchase-postings"
import {
  createMemberPaymentReceipt,
  reviewMemberPaymentReceipt,
  type PaymentReceiptAllocationInput,
} from "./payment-receipts"
import { recordProcurementPurchase } from "./procurement"
import { updateShareBusiness } from "./tenant-finance"

/**
 * Procurement and foodstuff receivable against local Postgres
 * (RUN_LOCAL_DB_INTEGRATION=1): release, partial and full repayment,
 * markup earned in proportion, no double post, the season hand-off, the
 * foodstuff month release and a release caught up for older goods.
 */
const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `purchase-it-${crypto.randomUUID().slice(0, 8)}`
const paidAt = new Date("2026-11-10T00:00:00.000Z")
let tenantId = ""
let userId = ""
let memberId = ""
let receiptCount = 0

async function balance(code: string) {
  const entries = await db!.ledgerEntry.findMany({
    select: { amount: true, direction: true },
    where: { ledgerAccount: { code }, tenantId },
  })
  return (
    Math.round(
      entries.reduce(
        (sum, entry) =>
          sum + (entry.direction === "debit" ? 1 : -1) * Number(entry.amount),
        0
      ) * 100
    ) / 100
  )
}

async function payReceipt(allocations: PaymentReceiptAllocationInput[]) {
  receiptCount += 1
  const receipt = await createMemberPaymentReceipt(
    {
      allocations,
      channel: "transfer",
      memberId,
      paidAt,
      paymentReference: `${slug}-R${receiptCount}`,
      submittedByUserId: userId,
      tenantId,
      totalAmount: allocations.reduce((sum, item) => sum + item.amount, 0),
    },
    db!
  )
  return reviewMemberPaymentReceipt(
    {
      actorUserId: userId,
      decision: "approved",
      receiptId: receipt.id,
      tenantId,
    },
    db!
  )
}

async function seasonProfit() {
  const business = await db!.shareBusiness.findFirst({
    where: { systemKey: memberPurchaseSalesBusinessKey, tenantId },
  })
  if (!business) return null
  const entries = await db!.shareBusinessProfitEntry.findMany({
    where: { shareBusinessId: business.id, tenantId },
  })
  return {
    business,
    total: entries.reduce((sum, entry) => sum + Number(entry.profitAmount), 0),
    entries,
  }
}

run("member purchase receivable", () => {
  beforeAll(async () => {
    const tenant = await db!.tenant.create({
      data: {
        initialMigrationStatus: "live_operations",
        migrationFinalizedAt: new Date("2025-01-01T00:00:00.000Z"),
        name: "Purchase Receivable Cooperative",
        slug,
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        status: "active",
      },
    })
    tenantId = tenant.id
    userId = (
      await db!.user.create({
        data: {
          email: `${slug}@example.test`,
          fullName: "Finance Officer",
          tenantId,
        },
      })
    ).id
    memberId = (
      await db!.member.create({
        data: {
          fullName: "Aisha Bello",
          joinedAt: new Date("2025-01-01T00:00:00.000Z"),
          memberNumber: `${slug}-1`,
          memberType: "individual",
          tenantId,
        },
      })
    ).id
    await db!.membership.create({
      data: { role: "finance_officer", tenantId, userId },
    })
    await ensureTenantLedgerAccounts(tenantId, db!)
  })

  afterAll(async () => {
    if (db && tenantId) {
      await db.auditLog.deleteMany({ where: { tenantId } })
      await db.ledgerEntry.deleteMany({ where: { tenantId } })
      await db.tenant.delete({ where: { id: tenantId } })
    }
    await db?.$disconnect()
  })

  let requestId = ""

  it("posts a procurement release once: cost + markup owed, cash down by cost", async () => {
    requestId = (
      await db!.procurementRequest.create({
        data: {
          approvedCost: 100_000,
          approvedMarkup: 12_000,
          approvedMonthlyRepayment: 28_000,
          approvedRepaymentMonths: 4,
          createdByUserId: userId,
          estimatedMonthlyRepayment: 25_000,
          itemName: "Freezer",
          memberId,
          requestedAt: new Date("2026-11-01T00:00:00.000Z"),
          requestedCost: 100_000,
          requestedRepaymentMonths: 4,
          status: "approved",
          tenantId,
        },
      })
    ).id

    const request = await recordProcurementPurchase(
      {
        actorUserId: userId,
        procurementRequestId: requestId,
        purchaseDate: new Date("2026-11-02T00:00:00.000Z"),
        tenantId,
      },
      db!
    )

    expect(request.repaymentScheduleItems.map((item) => item.amount)).toEqual([
      28_000, 28_000, 28_000, 28_000,
    ])
    expect(await balance("1200")).toBe(112_000)
    expect(await balance("2000")).toBe(-100_000)
    expect(await balance("2200")).toBe(-12_000)

    const audit = await db!.auditLog.findFirstOrThrow({
      where: {
        action: "member_purchase.released",
        entityId: requestId,
        tenantId,
      },
    })
    expect(audit.metadata).toMatchObject({
      cost: 100_000,
      markup: 12_000,
      releasedByUserId: userId,
    })

    // A retry posts nothing new.
    const again = await postMemberPurchaseRelease(
      await procurementReleaseInput(
        { procurementRequestId: requestId, tenantId },
        db!
      ),
      db!
    )
    expect(again.created).toBe(false)
    await expect(
      recordProcurementPurchase(
        {
          actorUserId: userId,
          procurementRequestId: requestId,
          purchaseDate: new Date("2026-11-02T00:00:00.000Z"),
          tenantId,
        },
        db!
      )
    ).rejects.toThrow()
    expect(
      await db!.ledgerTransaction.count({
        where: { tenantId, transactionType: "member_purchase_release" },
      })
    ).toBe(1)
  })

  it("earns the matching share of markup on a partial repayment", async () => {
    const items = await db!.procurementRepaymentScheduleItem.findMany({
      orderBy: { installmentNumber: "asc" },
      where: { procurementRequestId: requestId },
    })
    await payReceipt([
      {
        amount: 28_000,
        category: "procurement",
        procurementRepaymentScheduleItemId: items[0]!.id,
      },
    ])

    expect(await balance("1200")).toBe(84_000)
    expect(await balance("2000")).toBe(-72_000)
    expect(await balance("2200")).toBe(-9_000)
    expect(await balance("3300")).toBe(-3_000)

    const season = await seasonProfit()
    expect(season?.business.name).toBe("Procurement and foodstuff sales")
    expect(season?.total).toBe(3_000)
    expect(season?.entries).toHaveLength(1)
    expect(season?.entries[0]?.status).toBe("draft")
  })

  it("earns all of the markup on full repayment, without posting twice", async () => {
    const items = await db!.procurementRepaymentScheduleItem.findMany({
      orderBy: { installmentNumber: "asc" },
      where: { procurementRequestId: requestId },
    })
    const reviewed = await payReceipt(
      items.slice(1).map((item) => ({
        amount: 28_000,
        category: "procurement" as const,
        procurementRepaymentScheduleItemId: item.id,
      }))
    )

    expect(await balance("1200")).toBe(0)
    expect(await balance("2200")).toBe(0)
    expect(await balance("3300")).toBe(-12_000)
    expect(await balance("2000")).toBe(12_000)
    expect(
      (
        await db!.procurementRequest.findUniqueOrThrow({
          where: { id: requestId },
        })
      ).status
    ).toBe("completed")

    const season = await seasonProfit()
    expect(season?.total).toBe(12_000)
    expect(season?.entries).toHaveLength(1)

    // Re-approving the same receipt is refused and posts nothing.
    const before = await db!.ledgerTransaction.count({ where: { tenantId } })
    await expect(
      reviewMemberPaymentReceipt(
        {
          actorUserId: userId,
          decision: "approved",
          receiptId: reviewed.id,
          tenantId,
        },
        db!
      )
    ).rejects.toThrow()
    expect(await db!.ledgerTransaction.count({ where: { tenantId } })).toBe(
      before
    )
  })

  it("keeps the automatic business out of hand edits", async () => {
    const season = await seasonProfit()
    await expect(
      updateShareBusiness(
        {
          capitalAmount: 0,
          name: "Renamed",
          profitAmount: 0,
          shareBusinessId: season!.business.id,
          startDate: season!.business.startDate,
          tenantId,
        },
        db!
      )
    ).rejects.toThrow(/automatically/)
  })

  it("releases a foodstuff month's approved requests when it stops taking requests", async () => {
    const cycle = await db!.foodPurchaseCycle.create({
      data: {
        periodMonth: new Date("2026-11-01T00:00:00.000Z"),
        releasedAmount: 100_000,
        releasedAt: new Date("2026-11-01T00:00:00.000Z"),
        releasedByUserId: userId,
        status: "open",
        tenantId,
      },
    })
    const application = await db!.foodPurchaseApplication.create({
      data: {
        approvedAmount: 30_000,
        approvedMarkup: 3_000,
        cycleId: cycle.id,
        itemDescription: "Rice and beans",
        memberId,
        requestedAmount: 30_000,
        requestedAt: new Date("2026-11-02T00:00:00.000Z"),
        status: "approved",
        submittedByUserId: userId,
        tenantId,
      },
    })

    await transitionFoodPurchaseCycle(
      {
        actorUserId: userId,
        cycleId: cycle.id,
        expectedStatus: "open",
        tenantId,
        transition: "close_intake",
      },
      db!
    )

    expect(await balance("1200")).toBe(30_000)
    expect(await balance("2200")).toBe(-3_000)
    const released = await db!.foodPurchaseApplication.findUniqueOrThrow({
      where: { id: application.id },
    })
    expect(released.goodsReleasedAt).not.toBeNull()
    expect(released.goodsReleasedByUserId).toBe(userId)

    await payReceipt([
      {
        amount: 10_000,
        category: "food_purchase",
        foodPurchaseApplicationId: application.id,
      },
    ])
    expect(await balance("1200")).toBe(20_000)
    expect(await balance("3300")).toBe(-13_000)
    expect((await seasonProfit())?.total).toBe(13_000)

    // Food already given out: the month can no longer be cancelled.
    await expect(
      transitionFoodPurchaseCycle(
        {
          actorUserId: userId,
          cycleId: cycle.id,
          expectedStatus: "intake_closed",
          tenantId,
          transition: "cancel",
        },
        db!
      )
    ).rejects.toThrow(/given out/)
  })

  it("counts repayments made before the receivable existed when the month closes", async () => {
    const cycle = await db!.foodPurchaseCycle.create({
      data: {
        periodMonth: new Date("2026-10-01T00:00:00.000Z"),
        releasedAmount: 100_000,
        releasedAt: new Date("2026-10-01T00:00:00.000Z"),
        releasedByUserId: userId,
        status: "open",
        tenantId,
      },
    })
    // Approved and half paid before this change: no ledger rows for it yet.
    await db!.foodPurchaseApplication.create({
      data: {
        approvedAmount: 50_000,
        cycleId: cycle.id,
        memberId,
        paidAmount: 25_000,
        requestedAmount: 50_000,
        requestedAt: new Date("2026-10-02T00:00:00.000Z"),
        status: "approved",
        submittedByUserId: userId,
        tenantId,
      },
    })
    const receivableBefore = await balance("1200")
    const cashBefore = await balance("2000")

    await transitionFoodPurchaseCycle(
      {
        actorUserId: userId,
        cycleId: cycle.id,
        expectedStatus: "open",
        tenantId,
        transition: "close_intake",
      },
      db!
    )

    // Only what is still owed sits in 1200; the earlier ₦25,000 is cash in.
    expect(await balance("1200")).toBe(receivableBefore + 25_000)
    expect(await balance("2000")).toBe(cashBefore - 50_000 + 25_000)
  })

  it("catches up the release of goods bought before the receivable existed", async () => {
    const legacy = await db!.procurementRequest.create({
      data: {
        approvedCost: 6_000,
        approvedRepaymentMonths: 2,
        createdByUserId: userId,
        estimatedMonthlyRepayment: 3_000,
        itemName: "Generator",
        memberId,
        purchasedAt: new Date("2026-10-05T00:00:00.000Z"),
        purchasedByUserId: userId,
        requestedAt: new Date("2026-10-01T00:00:00.000Z"),
        requestedCost: 6_000,
        requestedRepaymentMonths: 2,
        status: "active",
        tenantId,
        repaymentScheduleItems: {
          create: [1, 2].map((installmentNumber) => ({
            amount: 3_000,
            dueDate: new Date(Date.UTC(2026, 10 + installmentNumber, 1)),
            installmentNumber,
            memberId,
            status: "due" as const,
            tenantId,
          })),
        },
      },
      include: { repaymentScheduleItems: true },
    })
    const receivableBefore = await balance("1200")

    await payReceipt([
      {
        amount: 3_000,
        category: "procurement",
        procurementRepaymentScheduleItemId:
          legacy.repaymentScheduleItems[0]!.id,
      },
    ])

    const release = await db!.ledgerTransaction.findFirstOrThrow({
      where: {
        idempotencyKey: `member-purchase-release:procurement:${legacy.id}`,
        tenantId,
      },
    })
    expect(release.postedAt.toISOString()).toBe("2026-10-05T00:00:00.000Z")
    expect(await balance("1200")).toBe(receivableBefore + 3_000)
  })
})
