import { describe, expect, test } from "bun:test"
import {
  getMobileAdminRepaymentFacility,
  getMobileAdminRepaymentSummary,
  getMobileAdminRepaymentWorkspace,
  mobileAdminRepaymentFacilityLimits,
} from "./mobile-admin-repayment-operations"

function createWorkspacePrisma() {
  const scheduleQueries: any[] = []
  const loan = {
    id: "loan-1",
    loanProduct: { name: "Normal financing" },
    member: {
      fullName: "Khadija Musa",
      id: "member-1",
      memberNumber: "HV-1021",
    },
    outstandingPrincipal: 75_000,
    principalAmount: 100_000,
    status: "active",
  }
  const schedule = {
    amountPaid: 5_000,
    collectionFollowUps: [
      {
        nextActionAt: new Date("2026-09-01T00:00:00.000Z"),
        priority: "high",
        status: "reminded",
      },
    ],
    dueAt: new Date("2026-08-01T00:00:00.000Z"),
    id: "schedule-1",
    installmentNumber: 1,
    loan,
    status: "due",
    totalDue: 25_000,
  }
  const aggregateQueries: any[] = []
  return {
    aggregateQueries,
    loan: {
      aggregate: async (args: any) => {
        aggregateQueries.push(args)
        expect(args.where.tenantId).toBe("tenant-1")
        return {
          _count: { _all: 1 },
          _sum: {
            outstandingPrincipal: loan.outstandingPrincipal,
            principalAmount: loan.principalAmount,
          },
        }
      },
      findMany: async () => {
        throw new Error("The summary must not scan loans")
      },
    },
    repayment: {
      count: async (args: any) => {
        aggregateQueries.push(args)
        return 4
      },
      findMany: async () => [],
    },
    repaymentScheduleItem: {
      aggregate: async (args: any) => {
        aggregateQueries.push(args)
        return {
          _count: { _all: 2 },
          _sum: { amountPaid: 5_000, totalDue: 25_000 },
        }
      },
      count: async (args: any) => {
        aggregateQueries.push(args)
        return 7
      },
      findMany: async (args: any) => {
        scheduleQueries.push(args)
        return [schedule]
      },
    },
    scheduleQueries,
    tenant: { findUnique: async () => ({ currencyCode: "NGN" }) },
  }
}

describe("mobile admin repayment operations", () => {
  test("keeps workspace reads tenant scoped and separates overdue amount from paid principal", async () => {
    const prisma = createWorkspacePrisma()
    const workspace = await getMobileAdminRepaymentWorkspace(
      {
        capabilities: { followUp: true, post: true, view: true },
        lane: "collections",
        search: "Khadija",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(
      prisma.scheduleQueries.every(
        (query) => query.where.tenantId === "tenant-1"
      )
    ).toBe(true)
    expect(workspace.items[0]).toMatchObject({
      amount: 20_000,
      latestFollowUp: { priority: "high", status: "reminded" },
      member: { name: "Khadija Musa", number: "HV-1021" },
    })
    expect(workspace.summary).toMatchObject({
      outstanding: 75_000,
      paidPrincipal: 25_000,
    })
  })

  test("reads the summary from tenant-scoped aggregates only, ignoring search", async () => {
    const prisma = createWorkspacePrisma()
    const summary = await getMobileAdminRepaymentSummary(
      { tenantId: "tenant-1" },
      prisma as never
    )
    expect(prisma.scheduleQueries).toHaveLength(0)
    expect(
      prisma.aggregateQueries.every(
        (query) => query.where.tenantId === "tenant-1"
      )
    ).toBe(true)
    expect(summary).toMatchObject({
      activeFacilities: 1,
      counts: { collections: 2, due: 7, posted: 4 },
      dueThisMonth: 20_000,
      outstanding: 75_000,
      overdue: 20_000,
      paidPrincipal: 25_000,
      principal: 100_000,
    })
  })

  test("pages a lane at the requested size without the summary", async () => {
    const prisma = createWorkspacePrisma()
    const workspace = await getMobileAdminRepaymentWorkspace(
      {
        capabilities: { followUp: true, post: true, view: true },
        includeSummary: false,
        lane: "due",
        limit: 20,
        tenantId: "tenant-1",
      },
      prisma as never
    )
    expect(prisma.scheduleQueries[0].take).toBe(21)
    expect(prisma.aggregateQueries).toHaveLength(0)
    expect("summary" in workspace).toBe(false)
    expect(workspace.nextCursor).toBeNull()
  })

  test("caps facility repayments and follow-ups", async () => {
    let include: any
    const prisma = {
      loan: {
        findFirst: async (args: any) => {
          include = args.include
          return null
        },
      },
    }
    await expect(
      getMobileAdminRepaymentFacility(
        { loanId: "loan-1", tenantId: "tenant-1" },
        prisma as never
      )
    ).rejects.toThrow()
    expect(include.repayments.take).toBe(
      mobileAdminRepaymentFacilityLimits.repayments
    )
    expect(include.collectionFollowUps.take).toBe(
      mobileAdminRepaymentFacilityLimits.followUps
    )
  })

  test("scopes facility detail by both tenant and facility identity", async () => {
    let facilityWhere: unknown
    const prisma = {
      loan: {
        findFirst: async (args: any) => {
          facilityWhere = args.where
          return null
        },
      },
    }

    await expect(
      getMobileAdminRepaymentFacility(
        { loanId: "other-tenant-loan", tenantId: "tenant-1" },
        prisma as never
      )
    ).rejects.toThrow("Financing facility not found")
    expect(facilityWhere).toEqual({
      id: "other-tenant-loan",
      tenantId: "tenant-1",
    })
  })
})
