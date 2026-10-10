import { describe, expect, test } from "bun:test"
import {
  getMobileAdminRepaymentFacility,
  getMobileAdminRepaymentWorkspace,
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
  return {
    loan: {
      findMany: async (args: any) => {
        expect(args.where.tenantId).toBe("tenant-1")
        return [loan]
      },
    },
    repayment: { findMany: async () => [] },
    repaymentScheduleItem: {
      findMany: async (args: any) => {
        scheduleQueries.push(args)
        return args.include ? [schedule] : [schedule]
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
