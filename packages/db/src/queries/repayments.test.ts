import { describe, expect, test } from "bun:test"
import {
  createRepaymentHistoryCursor,
  createRepaymentScheduleCursor,
  getRepayment,
  getRepaymentScheduleItem,
  getRepaymentSummary,
  isLateScheduleItem,
  listRepaymentHistoryPage,
  listRepaymentSchedulePage,
} from "./repayments"

const member = {
  fullName: "Aisha Member",
  id: "member-1",
  memberNumber: "M-001",
}

function scheduleItem(id: string, installmentNumber: number) {
  return {
    amountPaid: 25,
    collectionFollowUps: [
      {
        actorUser: { fullName: "Finance Officer", id: "user-1" },
        assignedToUser: { fullName: "Collections Officer", id: "user-2" },
        assignedToUserId: "user-2",
        caseStage: "promise_tracking",
        createdAt: new Date("2026-08-01T10:00:00.000Z"),
        id: `follow-up-${id}`,
        nextActionAt: null,
        note: "Called member",
        priority: "high",
        promiseToPayAt: null,
        resolutionStatus: "open",
        status: "promise_to_pay",
        updatedAt: new Date("2026-08-01T10:00:00.000Z"),
      },
    ],
    dueAt: new Date(`2026-08-0${installmentNumber}T00:00:00.000Z`),
    id,
    installmentNumber,
    loan: {
      id: "loan-1",
      loanProduct: { id: "product-1", name: "Normal financing" },
      member,
      status: "active",
    },
    status: "overdue",
    totalDue: 100,
    updatedAt: new Date("2026-08-01T10:00:00.000Z"),
  }
}

function repayment(id: string, amount: number) {
  return {
    amount,
    id,
    loan: {
      id: "loan-1",
      loanProduct: { id: "product-1", name: "Normal financing" },
    },
    member,
    paidAt: new Date("2026-08-02T10:00:00.000Z"),
    receivedByUser: { fullName: "Finance Officer", id: "user-1" },
    reference: "PMT-001",
    repaymentScheduleItemId: "schedule-1",
    status: "posted",
  }
}

function createRepaymentsPrismaStub() {
  const scheduleFindManyCalls: any[] = []
  const scheduleFindFirstCalls: any[] = []
  const repaymentFindManyCalls: any[] = []
  const repaymentFindFirstCalls: any[] = []
  const schedules = [
    scheduleItem("schedule-1", 1),
    scheduleItem("schedule-2", 2),
    scheduleItem("schedule-3", 3),
  ]
  const repayments = [
    repayment("repayment-1", 100),
    repayment("repayment-2", 50),
  ]

  return {
    repayment: {
      count: async () => 2,
      findFirst: async (args: any) => {
        repaymentFindFirstCalls.push(args)
        return repayments[0]
      },
      findMany: async (args: any) => {
        repaymentFindManyCalls.push(args)
        return repayments
      },
    },
    repaymentFindFirstCalls,
    repaymentFindManyCalls,
    repaymentScheduleItem: {
      aggregate: async () => ({
        _count: { _all: 3 },
        _sum: { amountPaid: 75, totalDue: 300 },
      }),
      count: async () => 3,
      findFirst: async (args: any) => {
        scheduleFindFirstCalls.push(args)
        return schedules[0]
      },
      findMany: async (args: any) => {
        scheduleFindManyCalls.push(args)
        return schedules
      },
    },
    scheduleFindFirstCalls,
    scheduleFindManyCalls,
  }
}

describe("repayment read models", () => {
  test("uses one composed collection predicate and owns pageSize plus one", async () => {
    const prisma = createRepaymentsPrismaStub()
    const result = await listRepaymentSchedulePage(
      {
        assignedToUserId: "11111111-1111-4111-8111-111111111111",
        memberId: "22222222-2222-4222-8222-222222222222",
        pageSize: 2,
        q: "Aisha",
        resolutionStatus: "open",
        stage: "promise_tracking",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(prisma.scheduleFindManyCalls[0]).toMatchObject({ take: 3 })
    expect(prisma.scheduleFindManyCalls[0].where.collectionFollowUps).toEqual({
      some: {
        assignedToUserId: "11111111-1111-4111-8111-111111111111",
        caseStage: "promise_tracking",
        resolutionStatus: "open",
      },
    })
    expect(prisma.scheduleFindManyCalls[0].where.loan).toMatchObject({
      is: {
        AND: [
          { memberId: "22222222-2222-4222-8222-222222222222" },
          expect.any(Object),
        ],
      },
    })
    expect(result.data).toHaveLength(2)
    // Row-only follow-up: outcome and promised date, no actor/assignee loads.
    expect(prisma.scheduleFindManyCalls[0].include.collectionFollowUps).toEqual(
      {
        orderBy: { createdAt: "desc" },
        select: { promiseToPayAt: true, status: true },
        take: 1,
      }
    )
    expect(result.data[0]).toMatchObject({
      outstandingAmount: 75,
    })
    expect(result.data[0]?.latestCollectionFollowUp).toEqual({
      promiseToPayAt: null,
      status: "promise_to_pay",
    })
    expect(result.meta).toMatchObject({ hasNextPage: true, total: 3 })
    expect(result.meta.cursor).toEqual(expect.any(String))
  })

  test("binds opaque schedule cursors to their active sort", async () => {
    const cursor = createRepaymentScheduleCursor(
      {
        amountPaid: 25,
        dueAt: new Date("2026-08-01T00:00:00.000Z"),
        id: "schedule-1",
        installmentNumber: 1,
        isLate: true,
        latestCollectionFollowUp: null,
        loan: {
          id: "loan-1",
          loanProduct: { id: "product-1", name: "Normal financing" },
          member,
          status: "active",
        },
        outstandingAmount: 75,
        status: "overdue",
        totalDue: 100,
        updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      },
      ["dueAt", "asc"]
    )

    await expect(
      listRepaymentSchedulePage(
        {
          cursor,
          sort: ["status", "asc"],
          tenantId: "tenant-1",
        },
        createRepaymentsPrismaStub() as never
      )
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
  })

  test("keeps uncontacted overdue installments in collections only", async () => {
    const prisma = createRepaymentsPrismaStub()
    const asOf = new Date("2026-11-14T00:00:00.000Z")

    await listRepaymentSchedulePage(
      { asOf, collectionsOnly: true, tenantId: "tenant-1" },
      prisma as never
    )

    expect(prisma.scheduleFindManyCalls[0].where).toMatchObject({
      AND: [
        {
          dueAt: { lt: asOf },
          status: { in: ["pending", "due", "partially_paid", "overdue"] },
        },
      ],
    })
    expect(
      prisma.scheduleFindManyCalls[0].where.collectionFollowUps
    ).toBeUndefined()
  })

  test("late is decided from the due date, not a refreshed status", () => {
    const asOf = new Date("2026-11-14T00:00:00.000Z")

    expect(
      isLateScheduleItem(
        { dueAt: "2021-11-02T00:00:00.000Z", status: "pending" },
        asOf
      )
    ).toBe(true)
    expect(
      isLateScheduleItem(
        { dueAt: "2026-11-14T00:00:00.000Z", status: "pending" },
        asOf
      )
    ).toBe(false)
    expect(
      isLateScheduleItem(
        { dueAt: "2021-11-02T00:00:00.000Z", status: "paid" },
        asOf
      )
    ).toBe(false)
    expect(
      isLateScheduleItem(
        { dueAt: "2021-11-02T00:00:00.000Z", status: "waived" },
        asOf
      )
    ).toBe(false)
    expect(
      isLateScheduleItem(
        { dueAt: "2026-11-01T00:00:00.000Z", status: "partially_paid" },
        asOf
      )
    ).toBe(true)
  })

  test("marks late rows on the list without changing the stored status", async () => {
    const prisma = createRepaymentsPrismaStub()
    const result = await listRepaymentSchedulePage(
      { asOf: new Date("2026-11-14T00:00:00.000Z"), tenantId: "tenant-1" },
      prisma as never
    )

    expect(result.data[0]).toMatchObject({ isLate: true, status: "overdue" })
  })

  test("returns bounded history rows and tenant-scoped detail records", async () => {
    const prisma = createRepaymentsPrismaStub()
    const result = await listRepaymentHistoryPage(
      { pageSize: 1, tenantId: "tenant-1" },
      prisma as never
    )
    const historyCursor = createRepaymentHistoryCursor(result.data[0]!, [
      "paidAt",
      "desc",
    ])

    expect(prisma.repaymentFindManyCalls[0]).toMatchObject({ take: 2 })
    expect(historyCursor).toEqual(expect.any(String))
    await getRepayment(
      {
        repaymentId: "33333333-3333-4333-8333-333333333333",
        tenantId: "tenant-1",
      },
      prisma as never
    )
    const scheduleDetail = await getRepaymentScheduleItem(
      {
        repaymentScheduleItemId: "44444444-4444-4444-8444-444444444444",
        tenantId: "tenant-1",
      },
      prisma as never
    )
    // The detail sheet keeps every follow-up with who logged and owns it.
    expect(scheduleDetail?.collectionFollowUps[0]).toMatchObject({
      actorUser: { fullName: "Finance Officer" },
      assignedToUser: { fullName: "Collections Officer" },
    })
    expect(scheduleDetail?.latestCollectionFollowUp).toMatchObject({
      caseStage: "promise_tracking",
    })
    expect(prisma.repaymentFindFirstCalls[0].where).toEqual({
      id: "33333333-3333-4333-8333-333333333333",
      tenantId: "tenant-1",
    })
    expect(prisma.scheduleFindFirstCalls[0].where).toEqual({
      id: "44444444-4444-4444-8444-444444444444",
      tenantId: "tenant-1",
    })
  })

  test("calculates summary from aggregate values without loading rows", async () => {
    const summary = await getRepaymentSummary(
      { tenantId: "tenant-1" },
      createRepaymentsPrismaStub() as never
    )

    expect(summary).toEqual({
      lateAmount: 225,
      overdueScheduleItems: 3,
      totalOutstandingAmount: 225,
      totalRepaidAmount: 75,
      totalRepayments: 2,
      totalScheduleItems: 3,
    })
  })
})
