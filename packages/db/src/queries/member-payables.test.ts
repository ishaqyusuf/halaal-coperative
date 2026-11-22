import { describe, expect, test } from "bun:test"
import {
  allocateReceiptAmount,
  DEFAULT_PAYMENT_ALLOCATION_SETTINGS,
  listMemberPayables,
  type MemberPayable,
  normalizePaymentAllocationOrder,
  orderMemberPayables,
  resolvePaymentAllocationSettings,
} from "./member-payables"

const now = new Date("2026-11-22T09:00:00.000Z")

function payable(
  kind: MemberPayable["kind"],
  amount: number,
  overrides: Partial<MemberPayable> = {}
): MemberPayable {
  const targetId = overrides.targetId ?? `${kind}-1`
  return {
    amount,
    dueDate: "2026-11-30",
    id: `${kind}:${targetId}`,
    kind,
    overdue: false,
    subtitle: null,
    targetId,
    title: kind,
    ...overrides,
  }
}

const owed = [
  payable("commitment", 25000, { targetId: "plan-1" }),
  payable("loan", 60000, { dueDate: "2026-11-25", targetId: "loan-1" }),
  payable("food_purchase", 48000, { dueDate: "2026-11-20", targetId: "food-1" }),
  payable("procurement", 72500, {
    dueDate: "2026-11-05",
    overdue: true,
    targetId: "schedule-3",
  }),
]

describe("payment order", () => {
  test("puts overdue first, then procurement, foodstuff, loans, shares, commitment", () => {
    const ordered = orderMemberPayables([
      ...owed,
      payable("shares", 50000, { dueDate: null, targetId: "share-app-1" }),
      payable("procurement", 72500, {
        dueDate: "2026-12-05",
        targetId: "schedule-4",
      }),
      payable("loan", 10000, {
        dueDate: "2026-10-25",
        overdue: true,
        targetId: "loan-2",
      }),
    ])

    expect(ordered.map((item) => item.id)).toEqual([
      "loan:loan-2",
      "procurement:schedule-3",
      "procurement:schedule-4",
      "food_purchase:food-1",
      "loan:loan-1",
      "shares:share-app-1",
      "commitment:plan-1",
    ])
  })

  test("follows a saved tenant order and fills in missing kinds", () => {
    expect(normalizePaymentAllocationOrder(["commitment", "nope", "loan"])).toEqual([
      "commitment",
      "loan",
      "overdue",
      "procurement",
      "food_purchase",
      "shares",
    ])
    expect(resolvePaymentAllocationSettings(null)).toEqual(
      DEFAULT_PAYMENT_ALLOCATION_SETTINGS
    )
    expect(
      resolvePaymentAllocationSettings({
        paymentAllocationMode: "member_choice",
        paymentAllocationOrder: [],
      }).mode
    ).toBe("member_choice")
  })
})

describe("allocateReceiptAmount", () => {
  test("part-pays the first item it cannot cover and stops", () => {
    const allocations = allocateReceiptAmount({
      now,
      payables: owed,
      totalAmount: 100000,
    })

    expect(allocations).toEqual([
      {
        amount: 72500,
        category: "procurement",
        procurementRepaymentScheduleItemId: "schedule-3",
      },
      {
        amount: 27500,
        category: "food_purchase",
        foodPurchaseApplicationId: "food-1",
      },
    ])
  })

  test("pays everything owed and sends the overpayment to special savings", () => {
    const allocations = allocateReceiptAmount({
      now,
      payables: owed,
      totalAmount: 230000,
    })

    expect(allocations.map((line) => [line.category, line.amount])).toEqual([
      ["procurement", 72500],
      ["food_purchase", 48000],
      ["loan_servicing", 60000],
      ["commitment", 25000],
      ["special_savings", 24500],
    ])
    expect(allocations.reduce((sum, line) => sum + line.amount, 0)).toBe(230000)
    expect(allocations[2]).toMatchObject({
      loanId: "loan-1",
      periodIntent: "current_period",
      targetPeriodStart: new Date("2026-11-01T00:00:00.000Z"),
    })
    expect(allocations[3]).toMatchObject({ contributionPlanId: "plan-1" })
  })

  test("puts the whole amount in special savings when nothing is owed", () => {
    expect(
      allocateReceiptAmount({ now, payables: [], totalAmount: 30000 })
    ).toEqual([
      {
        amount: 30000,
        category: "special_savings",
        periodIntent: "current_period",
        targetPeriodStart: new Date("2026-11-01T00:00:00.000Z"),
      },
    ])
  })

  test("keeps kobo exact across partial payments", () => {
    const allocations = allocateReceiptAmount({
      now,
      payables: [payable("procurement", 100.1), payable("commitment", 50.2)],
      totalAmount: 120.35,
    })
    expect(allocations.map((line) => line.amount)).toEqual([100.1, 20.25])
  })

  test("pays an approved share purchase against that application", () => {
    const [line] = allocateReceiptAmount({
      now,
      payables: [
        payable("shares", 50000, { dueDate: null, targetId: "share-app-1" }),
      ],
      totalAmount: 50000,
    })
    expect(line).toMatchObject({
      amount: 50000,
      category: "shares",
      memberShareApplicationId: "share-app-1",
    })
  })
})

function payablesPrisma(overrides: Record<string, unknown[]> = {}) {
  const calls: Record<string, any> = {}
  const delegate = (name: string, rows: unknown[]) => ({
    fields: { amountPaid: "amount_paid", paidAmount: "paid_amount" },
    findFirst: async (input: any) => {
      calls[name] = input
      return rows[0] ?? null
    },
    findMany: async (input: any) => {
      calls[name] = input
      return rows
    },
    findUnique: async (input: any) => {
      calls[name] = input
      return rows[0] ?? null
    },
  })
  const prisma = {
    contributionPlan: delegate("plan", overrides.plan ?? []),
    foodPurchaseApplication: delegate("food", overrides.food ?? []),
    memberShareApplication: delegate("shares", overrides.shares ?? []),
    procurementRepaymentScheduleItem: delegate(
      "procurement",
      overrides.procurement ?? []
    ),
    repaymentScheduleItem: delegate("loans", overrides.loans ?? []),
    tenantPolicy: delegate("policy", overrides.policy ?? []),
  }
  return { calls, prisma: prisma as any }
}

describe("listMemberPayables", () => {
  test("returns nothing when the member owes nothing", async () => {
    const { prisma } = payablesPrisma()
    expect(
      await listMemberPayables(
        { memberId: "member-1", now, tenantId: "tenant-1" },
        prisma
      )
    ).toEqual([])
  })

  test("lists shares only from approved purchases still awaiting payment", async () => {
    const { calls, prisma } = payablesPrisma({
      shares: [
        {
          approvedUnits: 10,
          id: "share-app-1",
          paidAmount: 20000,
          reviewedAt: new Date("2026-11-18T10:00:00.000Z"),
          unitAmountSnapshot: 5000,
        },
      ],
    })

    const payables = await listMemberPayables(
      { memberId: "member-1", now, tenantId: "tenant-1" },
      prisma
    )

    expect(calls.shares.where).toEqual({
      memberId: "member-1",
      paymentDue: true,
      status: "approved",
      tenantId: "tenant-1",
    })
    expect(payables).toEqual([
      {
        amount: 30000,
        dueDate: null,
        id: "shares:share-app-1",
        kind: "shares",
        overdue: false,
        subtitle: "Approved 18 Nov",
        targetId: "share-app-1",
        title: "10 share units",
      },
    ])
  })

  test("builds procurement, foodstuff, loan and commitment payables in order", async () => {
    const request = {
      _count: { repaymentScheduleItems: 6 },
      id: "request-1",
      itemName: "Laptop",
    }
    const { calls, prisma } = payablesPrisma({
      food: [
        {
          approvedAmount: 48000,
          approvedPaybackMonths: 1,
          cycle: { periodMonth: new Date("2026-11-01T00:00:00.000Z") },
          id: "food-1",
          itemDescription: "Rice and oil",
          paidAmount: 0,
        },
      ],
      loans: [
        {
          amountPaid: 0,
          dueAt: new Date("2026-11-25T00:00:00.000Z"),
          loan: { id: "loan-1", loanProduct: { name: "Equipment financing" } },
          totalDue: 60000,
        },
      ],
      plan: [
        {
          amount: 25000,
          contributions: [{ committedAmount: 5000 }],
          id: "plan-1",
        },
      ],
      policy: [{ paymentAllocationMode: "automatic", paymentAllocationOrder: [] }],
      procurement: [
        {
          amount: 72500,
          dueDate: new Date("2026-11-05T00:00:00.000Z"),
          id: "schedule-3",
          installmentNumber: 3,
          paidAmount: 0,
          procurementRequest: request,
        },
        {
          amount: 72500,
          dueDate: new Date("2026-12-05T00:00:00.000Z"),
          id: "schedule-4",
          installmentNumber: 4,
          paidAmount: 0,
          procurementRequest: request,
        },
      ],
    })

    const payables = await listMemberPayables(
      { memberId: "member-1", now, tenantId: "tenant-1" },
      prisma
    )

    expect(
      payables.map((item) => [item.id, item.amount, item.overdue, item.subtitle])
    ).toEqual([
      ["procurement:schedule-3", 72500, true, "Instalment 3 of 6"],
      ["food_purchase:food-1", 48000, false, "Rice and oil"],
      ["loan:loan-1", 60000, false, "Repayment"],
      ["commitment:plan-1", 20000, false, "November"],
    ])
    // Every source read is bounded.
    expect(calls.procurement.take).toBeGreaterThan(0)
    expect(calls.food.take).toBeGreaterThan(0)
    expect(calls.loans.take).toBeGreaterThan(0)
    expect(calls.shares.take).toBeGreaterThan(0)
  })
})
