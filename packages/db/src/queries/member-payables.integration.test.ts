import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import { ensureTenantLedgerAccounts } from "./ledger"
import { getMobileMemberPayables } from "./mobile-member-receipts"
import {
  AUTO_ALLOCATION_REASON,
  createMemberPaymentReceipt,
  reviewMemberPaymentReceipt,
} from "./payment-receipts"

/**
 * T30 end to end on the local database: a member's payables come back in the
 * cooperative's order, and a receipt sent without a split is applied in that
 * order when staff approve it (overdue first, partial last, leftover to
 * special savings, shares only for an approved purchase awaiting payment).
 */
const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `payables-it-${crypto.randomUUID().slice(0, 8)}`
let tenantId = ""
let userId = ""
let memberId = ""
let planId = ""
let scheduleId = ""
let foodId = ""
let shareApplicationId = ""

const now = new Date()
const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

run("member payables and automatic allocation", () => {
  beforeAll(async () => {
    tenantId = (
      await db!.tenant.create({
        data: {
          initialMigrationStatus: "live_operations",
          migrationFinalizedAt: new Date("2025-01-01T00:00:00.000Z"),
          name: "Payables Cooperative",
          slug,
          startDate: new Date("2025-01-01T00:00:00.000Z"),
          status: "active",
        },
      })
    ).id
    userId = (
      await db!.user.create({
        data: {
          email: `${slug}@example.test`,
          fullName: "Aisha Bello",
          tenantId,
        },
      })
    ).id
    await db!.membership.create({
      data: { role: "member", tenantId, userId },
    })
    await ensureTenantLedgerAccounts(tenantId, db!)
    memberId = (
      await db!.member.create({
        data: {
          fullName: "Aisha Bello",
          joinedAt: new Date("2025-01-01T00:00:00.000Z"),
          memberNumber: "QHC-0042",
          memberType: "individual",
          tenantId,
          userId,
        },
      })
    ).id
    planId = (
      await db!.contributionPlan.create({
        data: {
          amount: 5000,
          memberId,
          name: "Monthly commitment",
          startsAt: new Date("2025-01-01T00:00:00.000Z"),
          tenantId,
        },
      })
    ).id
    const request = await db!.procurementRequest.create({
      data: {
        createdByUserId: userId,
        estimatedMonthlyRepayment: 1000,
        itemName: "Laptop",
        memberId,
        requestedAt: new Date("2025-06-01T00:00:00.000Z"),
        requestedCost: 2000,
        requestedRepaymentMonths: 2,
        status: "active",
        tenantId,
      },
    })
    scheduleId = (
      await db!.procurementRepaymentScheduleItem.create({
        data: {
          amount: 1000,
          dueDate: new Date(monthStart.getTime() - 20 * 86_400_000),
          installmentNumber: 1,
          memberId,
          procurementRequestId: request.id,
          status: "overdue",
          tenantId,
        },
      })
    ).id
    await db!.procurementRepaymentScheduleItem.create({
      data: {
        amount: 1000,
        dueDate: new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 5)),
        installmentNumber: 2,
        memberId,
        procurementRequestId: request.id,
        status: "pending",
        tenantId,
      },
    })
    const cycle = await db!.foodPurchaseCycle.create({
      data: {
        periodMonth: monthStart,
        releasedAmount: 100000,
        releasedAt: monthStart,
        releasedByUserId: userId,
        tenantId,
      },
    })
    foodId = (
      await db!.foodPurchaseApplication.create({
        data: {
          approvedAmount: 3000,
          cycleId: cycle.id,
          memberId,
          requestedAmount: 3000,
          requestedAt: monthStart,
          status: "approved",
          submittedByUserId: userId,
          tenantId,
        },
      })
    ).id
    shareApplicationId = (
      await db!.memberShareApplication.create({
        data: {
          approvedUnits: 2,
          memberId,
          paymentDue: true,
          requestedUnits: 2,
          reviewedAt: monthStart,
          shareValueSnapshot: 2000,
          status: "approved",
          tenantId,
          unitAmountSnapshot: 1000,
        },
      })
    ).id
    // An approved purchase already settled at approval: never a payable.
    await db!.memberShareApplication.create({
      data: {
        approvedUnits: 5,
        memberId,
        requestedUnits: 5,
        shareValueSnapshot: 5000,
        status: "approved",
        tenantId,
        unitAmountSnapshot: 1000,
      },
    })
  })

  afterAll(async () => {
    if (db && tenantId) {
      await db.auditLog.deleteMany({ where: { tenantId } })
      await db.ledgerEntry.deleteMany({ where: { tenantId } })
      await db.tenant.delete({ where: { id: tenantId } })
    }
    await db?.$disconnect()
  })

  it("lists the member's payables in the cooperative's order", async () => {
    const snapshot = await getMobileMemberPayables({ tenantId, userId }, db!)
    expect(snapshot.mode).toBe("automatic")
    expect(
      snapshot.payables.map((item) => [item.kind, item.amount, item.overdue])
    ).toEqual([
      ["procurement", 1000, true],
      ["food_purchase", 3000, false],
      ["shares", 2000, false],
      ["commitment", 5000, false],
    ])
  })

  it("applies an unsplit receipt in order at approval and pays the targets", async () => {
    const receipt = await createMemberPaymentReceipt(
      {
        allocations: [],
        autoAllocate: true,
        memberId,
        paidAt: now,
        paymentReference: `${slug}-AUTO`,
        submittedByUserId: userId,
        tenantId,
        totalAmount: 12000,
      },
      db!
    )
    expect(receipt.allocations).toEqual([])

    const reviewed = await reviewMemberPaymentReceipt(
      { actorUserId: userId, decision: "approved", receiptId: receipt.id, tenantId },
      db!
    )

    expect(reviewed.status).toBe("approved")
    expect(
      (
        await db!.memberPaymentReceipt.findUniqueOrThrow({
          select: { adjustmentReason: true },
          where: { id: receipt.id },
        })
      ).adjustmentReason
    ).toBe(AUTO_ALLOCATION_REASON)
    expect(
      reviewed.allocations
        .map((line) => [line.category, line.amount])
        .sort((left, right) => String(left[0]).localeCompare(String(right[0])))
    ).toEqual([
      ["commitment", 5000],
      ["food_purchase", 3000],
      ["procurement", 1000],
      ["shares", 2000],
      ["special_savings", 1000],
    ])
    const [schedule, food, share] = await Promise.all([
      db!.procurementRepaymentScheduleItem.findUniqueOrThrow({
        where: { id: scheduleId },
      }),
      db!.foodPurchaseApplication.findUniqueOrThrow({ where: { id: foodId } }),
      db!.memberShareApplication.findUniqueOrThrow({
        where: { id: shareApplicationId },
      }),
    ])
    expect(Number(schedule.paidAmount)).toBe(1000)
    expect(Number(food.paidAmount)).toBe(3000)
    expect(Number(share.paidAmount)).toBe(2000)
    expect(share.paymentDue).toBe(false)

    const after = await getMobileMemberPayables({ tenantId, userId }, db!)
    expect(after.payables.map((item) => item.kind)).toEqual(["procurement"])
    expect(after.payables[0]?.subtitle).toBe("Instalment 2 of 2")
  })

  it("refuses an unsplit receipt when the cooperative wants members to choose", async () => {
    await db!.tenantPolicy.upsert({
      create: { paymentAllocationMode: "member_choice", tenantId },
      update: { paymentAllocationMode: "member_choice" },
      where: { tenantId },
    })
    await expect(
      createMemberPaymentReceipt(
        {
          allocations: [],
          autoAllocate: true,
          memberId,
          paidAt: now,
          tenantId,
          totalAmount: 500,
        },
        db!
      )
    ).rejects.toThrow("Pick what this payment is for")
  })
})
