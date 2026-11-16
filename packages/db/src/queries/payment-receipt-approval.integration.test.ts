import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { recordMemberPaymentMutation } from "./contributions"
import { ensureTenantLedgerAccounts } from "./ledger"
import {
  createMemberPaymentReceipt,
  reviewMemberPaymentReceipt,
  type PaymentReceiptAllocationInput,
} from "./payment-receipts"

/**
 * Equivalence check for batched receipt approval (audit L7).
 *
 * Savings groups are now posted together instead of one
 * `recordMemberPaymentMutation` per period. Member A's receipt is approved;
 * member B gets the same groups through `recordMemberPaymentMutation`, and
 * every contribution, ledger posting and audit entry must match.
 * Procurement, Foodstuff Purchase and project financing targets are read
 * once and paid in allocation order, so repeated allocations to one target
 * must add up, and fail, exactly as the per-allocation reads did.
 */
const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const slug = `receipt-batch-it-${crypto.randomUUID().slice(0, 8)}`
const paidAt = new Date("2026-03-10T00:00:00.000Z")
let tenantId = ""
let userId = ""
let memberA = ""
let memberB = ""
let planA = ""
let planB = ""
let procurementRequestId = ""
let scheduleIds: string[] = []
let foodApplicationId = ""
let financingRequestId = ""

const months = [0, 1, 2, 3, 4, 5].map(
  (index) => new Date(Date.UTC(2025, 8 + index, 1))
)

async function createMember(memberNumber: string) {
  const member = await db!.member.create({
    data: {
      fullName: `Receipt ${memberNumber}`,
      joinedAt: new Date("2025-01-01T00:00:00.000Z"),
      memberNumber,
      memberType: "individual",
      tenantId,
    },
  })
  const plan = await db!.contributionPlan.create({
    data: {
      amount: 5000,
      memberId: member.id,
      name: "Monthly commitment",
      startsAt: new Date("2025-01-01T00:00:00.000Z"),
      tenantId,
    },
  })
  return [member.id, plan.id] as const
}

async function createScheduleRequest(itemCount: number) {
  const request = await db!.procurementRequest.create({
    data: {
      createdByUserId: userId,
      estimatedMonthlyRepayment: 1000,
      itemName: "Freezer",
      memberId: memberA,
      requestedAt: new Date("2025-06-01T00:00:00.000Z"),
      requestedCost: 1000 * itemCount,
      requestedRepaymentMonths: itemCount,
      status: "active",
      tenantId,
    },
  })
  const items = await Promise.all(
    Array.from({ length: itemCount }, (_, index) =>
      db!.procurementRepaymentScheduleItem.create({
        data: {
          amount: 1000,
          dueDate: new Date(Date.UTC(2026, index, 1)),
          installmentNumber: index + 1,
          memberId: memberA,
          procurementRequestId: request.id,
          status: "due",
          tenantId,
        },
      })
    )
  )
  return [request.id, items.map((item) => item.id)] as const
}

async function approve(
  memberId: string,
  allocations: PaymentReceiptAllocationInput[],
  reference: string
) {
  const receipt = await createMemberPaymentReceipt(
    {
      allocations,
      channel: "transfer",
      memberId,
      paidAt,
      paymentReference: reference,
      submittedByUserId: userId,
      tenantId,
      totalAmount: allocations.reduce((sum, item) => sum + item.amount, 0),
    },
    db!
  )
  const reviewed = await reviewMemberPaymentReceipt(
    {
      actorUserId: userId,
      decision: "approved",
      receiptId: receipt.id,
      tenantId,
    },
    db!
  )
  return { receipt, reviewed }
}

const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

/** A member's savings postings with ids and member-specific values masked. */
async function savingsOf(memberId: string) {
  const mask = (value: unknown) =>
    JSON.stringify(value).replaceAll(memberId, "MEMBER").replace(uuid, "ID")
  const [contributions, transactions, audits, member] = await Promise.all([
    db!.contribution.findMany({
      omit: {
        contributionPlanId: true,
        createdAt: true,
        id: true,
        reference: true,
        updatedAt: true,
      },
      orderBy: [{ periodLabel: "asc" }],
      where: { memberId, tenantId },
    }),
    db!.ledgerTransaction.findMany({
      include: {
        entries: {
          omit: { createdAt: true, id: true, ledgerTransactionId: true },
          orderBy: { direction: "asc" },
        },
      },
      omit: {
        contributionId: true,
        createdAt: true,
        id: true,
        reference: true,
      },
      orderBy: [{ narration: "asc" }],
      where: { memberId, tenantId },
    }),
    db!.auditLog.findMany({
      omit: { actorUserId: true, createdAt: true, id: true, occurredAt: true },
      where: {
        action: "member_payment.recorded",
        metadata: { equals: memberId, path: ["memberId"] },
        tenantId,
      },
    }),
    db!.member.findUniqueOrThrow({
      select: { totalSavingsSnapshot: true },
      where: { id: memberId },
    }),
  ])
  return {
    audits: audits.map(mask).sort(),
    contributions: contributions.map(mask),
    snapshot: Number(member.totalSavingsSnapshot),
    transactions: transactions.map(mask),
  }
}

run("batched receipt approval", () => {
  beforeAll(async () => {
    const tenant = await db!.tenant.create({
      data: {
        initialMigrationStatus: "live_operations",
        migrationFinalizedAt: new Date("2025-01-01T00:00:00.000Z"),
        name: "Receipt Batching Cooperative",
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
          fullName: "Receipt Officer",
          tenantId,
        },
      })
    ).id
    await ensureTenantLedgerAccounts(tenantId, db!)
    ;[memberA, planA] = await createMember("RB-A")
    ;[memberB, planB] = await createMember("RB-B")
    ;[procurementRequestId, scheduleIds] = await createScheduleRequest(3)
    const cycle = await db!.foodPurchaseCycle.create({
      data: {
        periodMonth: new Date("2026-03-01T00:00:00.000Z"),
        releasedAmount: 100000,
        releasedAt: new Date("2026-03-01T00:00:00.000Z"),
        releasedByUserId: userId,
        tenantId,
      },
    })
    foodApplicationId = (
      await db!.foodPurchaseApplication.create({
        data: {
          approvedAmount: 3000,
          cycleId: cycle.id,
          memberId: memberA,
          requestedAmount: 3000,
          requestedAt: new Date("2026-03-02T00:00:00.000Z"),
          status: "approved",
          submittedByUserId: userId,
          tenantId,
        },
      })
    ).id
    financingRequestId = (
      await db!.projectFinancingRequest.create({
        data: {
          approvedAmount: 5000,
          approvedStructure: "repayable_facility",
          businessName: "Bakery",
          createdByUserId: userId,
          memberId: memberA,
          requestedAmount: 5000,
          requestedAt: new Date("2026-01-02T00:00:00.000Z"),
          status: "active",
          tenantId,
        },
      })
    ).id
  })

  afterAll(async () => {
    if (db && tenantId) {
      await db.auditLog.deleteMany({ where: { tenantId } })
      await db.ledgerEntry.deleteMany({ where: { tenantId } })
      await db.tenant.delete({ where: { id: tenantId } })
    }
    await db?.$disconnect()
  })

  it("posts savings groups exactly as recordMemberPaymentMutation does", async () => {
    const savings: PaymentReceiptAllocationInput[] = [
      ...months.map((month) => ({
        amount: 5000,
        category: "commitment" as const,
        contributionPlanId: planA,
        periodIntent: "back_period" as const,
        targetPeriodStart: month,
      })),
      {
        amount: 1250.5,
        category: "special_savings",
        contributionPlanId: planA,
        periodIntent: "back_period",
        targetPeriodStart: months[2],
      },
    ]
    const { receipt } = await approve(memberA, savings, "RB-SAVINGS")

    // The per-row reference: one recordMemberPaymentMutation per period.
    await db!.$transaction(async (tx) => {
      for (const [index, month] of months.entries()) {
        const extra = index === 2 ? 1250.5 : 0
        const label = new Intl.DateTimeFormat("en", {
          month: "long",
          timeZone: "UTC",
          year: "numeric",
        }).format(month)
        await recordMemberPaymentMutation(
          {
            actorUserId: userId,
            channel: "transfer",
            committedSavingsAmount: 5000,
            contributionPlanId: planB,
            extraSavingsAmount: extra,
            memberId: memberB,
            periodLabel: `${label} (back payment)`,
            postedAt: paidAt,
            reference: "RB-SAVINGS",
            tenantId,
            totalAmount: 5000 + extra,
          },
          tx as unknown as PrismaClient
        )
      }
    })

    const [batched, perRow] = await Promise.all([
      savingsOf(memberA),
      savingsOf(memberB),
    ])
    expect(batched.contributions).toHaveLength(6)
    expect(batched.snapshot).toBe(31250.5)
    expect(batched).toEqual(perRow)

    // Every savings allocation points at its period's contribution.
    const allocations = await db!.memberPaymentReceiptAllocation.findMany({
      include: { postedContribution: { select: { periodLabel: true } } },
      where: { receiptId: receipt.id },
    })
    expect(allocations).toHaveLength(7)
    for (const allocation of allocations) {
      expect(allocation.postedContribution?.periodLabel).toContain(
        new Intl.DateTimeFormat("en", {
          month: "long",
          timeZone: "UTC",
          year: "numeric",
        }).format(allocation.targetPeriodStart!)
      )
    }

    // An approved receipt cannot be approved again; nothing is reposted.
    await expect(
      reviewMemberPaymentReceipt(
        {
          actorUserId: userId,
          decision: "approved",
          receiptId: receipt.id,
          tenantId,
        },
        db!
      )
    ).rejects.toThrow("Approved or rejected receipts cannot be reviewed again.")
    expect(await savingsOf(memberA)).toEqual(batched)
  })

  it("pays repeated allocations to one target cumulatively and completes the request", async () => {
    await approve(
      memberA,
      [
        {
          amount: 1000,
          category: "procurement",
          procurementRepaymentScheduleItemId: scheduleIds[0],
        },
        {
          amount: 400,
          category: "procurement",
          procurementRepaymentScheduleItemId: scheduleIds[1],
        },
        {
          amount: 600,
          category: "procurement",
          procurementRepaymentScheduleItemId: scheduleIds[1],
        },
        {
          amount: 300,
          category: "procurement",
          procurementRepaymentScheduleItemId: scheduleIds[2],
        },
        {
          amount: 1000,
          category: "food_purchase",
          foodPurchaseApplicationId: foodApplicationId,
        },
        {
          amount: 500,
          category: "food_purchase",
          foodPurchaseApplicationId: foodApplicationId,
        },
        {
          amount: 2000,
          category: "project_financing",
          projectFinancingRequestId: financingRequestId,
        },
      ],
      "RB-TARGETS-1"
    )

    const items = () =>
      db!.procurementRepaymentScheduleItem.findMany({
        orderBy: { installmentNumber: "asc" },
        select: { paidAmount: true, status: true },
        where: { procurementRequestId },
      })
    expect(
      (await items()).map((item) => [Number(item.paidAmount), item.status])
    ).toEqual([
      [1000, "paid"],
      [1000, "paid"],
      [300, "partially_paid"],
    ])
    expect(
      await db!.procurementRequest.findUniqueOrThrow({
        select: { status: true },
        where: { id: procurementRequestId },
      })
    ).toEqual({ status: "active" })
    expect(
      await db!.foodPurchaseApplication.findUniqueOrThrow({
        select: { paidAmount: true, paidAt: true },
        where: { id: foodApplicationId },
      })
    ).toEqual({ paidAmount: expect.anything(), paidAt: null })
    expect(
      await db!.projectFinancingRequest.findUniqueOrThrow({
        select: { paidAt: true, status: true },
        where: { id: financingRequestId },
      })
    ).toEqual({ paidAt: null, status: "active" })

    // The rest of each balance completes all three.
    await approve(
      memberA,
      [
        {
          amount: 700,
          category: "procurement",
          procurementRepaymentScheduleItemId: scheduleIds[2],
        },
        {
          amount: 1500,
          category: "food_purchase",
          foodPurchaseApplicationId: foodApplicationId,
        },
        {
          amount: 3000,
          category: "project_financing",
          projectFinancingRequestId: financingRequestId,
        },
      ],
      "RB-TARGETS-2"
    )
    expect((await items()).map((item) => item.status)).toEqual([
      "paid",
      "paid",
      "paid",
    ])
    expect(
      await db!.procurementRequest.findUniqueOrThrow({
        select: { status: true },
        where: { id: procurementRequestId },
      })
    ).toEqual({ status: "completed" })
    const food = await db!.foodPurchaseApplication.findUniqueOrThrow({
      select: { paidAmount: true, paidAt: true },
      where: { id: foodApplicationId },
    })
    expect([Number(food.paidAmount), food.paidAt]).toEqual([3000, paidAt])
    const financing = await db!.projectFinancingRequest.findUniqueOrThrow({
      select: { paidAmount: true, paidAt: true, status: true },
      where: { id: financingRequestId },
    })
    expect([
      Number(financing.paidAmount),
      financing.paidAt,
      financing.status,
    ]).toEqual([5000, paidAt, "completed"])
  })

  it("a second allocation to a paid item fails the review and writes nothing", async () => {
    const [requestId, [itemId]] = await createScheduleRequest(1)
    const allocations: PaymentReceiptAllocationInput[] = [
      {
        amount: 5000,
        category: "commitment",
        contributionPlanId: planA,
        periodIntent: "current_period",
        targetPeriodStart: new Date("2026-03-01T00:00:00.000Z"),
      },
      {
        amount: 1000,
        category: "procurement",
        procurementRepaymentScheduleItemId: itemId,
      },
      {
        amount: 1000,
        category: "procurement",
        procurementRepaymentScheduleItemId: itemId,
      },
    ]
    const before = await savingsOf(memberA)

    await expect(approve(memberA, allocations, "RB-DOUBLE")).rejects.toThrow(
      "Procurement schedule item was not found or is no longer payable."
    )
    expect(
      await db!.procurementRepaymentScheduleItem.findUniqueOrThrow({
        select: { paidAmount: true, status: true },
        where: { id: itemId },
      })
    ).toEqual({ paidAmount: expect.anything(), status: "due" })
    expect(
      await db!.procurementRequest.findUniqueOrThrow({
        select: { status: true },
        where: { id: requestId },
      })
    ).toEqual({ status: "active" })
    expect(await savingsOf(memberA)).toEqual(before)
  })
})
