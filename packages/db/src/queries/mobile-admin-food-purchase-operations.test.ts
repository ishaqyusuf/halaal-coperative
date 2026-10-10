import { describe, expect, test } from "bun:test"
import { getMobileAdminFoodPurchaseWorkspace } from "./mobile-admin-food-purchase-operations"

const releasedByUser = {
  email: "finance@example.test",
  fullName: "Finance Officer",
  id: "user-finance",
}

function createApplication(index: number) {
  const requestedAt = new Date(Date.UTC(2026, 7, 30, 12, 0, 0) - index * 60_000)
  return {
    approvedAmount: 130_000,
    approvedPaybackMonths: 4,
    allowsCommitmentReductionDuringPayback: false,
    createdAt: requestedAt,
    cycle: {
      id: "cycle-1",
      periodMonth: new Date("2026-08-01T00:00:00.000Z"),
      releasedAmount: 100_000,
      status: "open",
    },
    cycleId: "cycle-1",
    id: `application-${String(index).padStart(2, "0")}`,
    itemDescription: index === 0 ? "Rice and beans" : "Staple allocation",
    member: {
      email: `member-${index}@example.test`,
      fullName: index === 0 ? "Amina Yusuf" : `Member ${index}`,
      id: `member-${index}`,
      memberNumber: `ABC-${String(index).padStart(4, "0")}`,
    },
    memberId: `member-${index}`,
    paidAmount: 40_000,
    paidAt: null,
    policyMaximumPaybackMonths: 6,
    requestedAmount: 130_000,
    requestedAt,
    requestNotes: null,
    reviewedAt: requestedAt,
    reviewedByUser: releasedByUser,
    reviewedByUserId: releasedByUser.id,
    reviewNotes: "Approved against the recorded policy snapshot.",
    status: "approved",
    submittedByUser: releasedByUser,
    submittedByUserId: releasedByUser.id,
    updatedAt: requestedAt,
  }
}

function createWorkspacePrisma() {
  const applicationQueries: any[] = []
  const countQueries: any[] = []
  const applications = Array.from({ length: 31 }, (_, index) =>
    createApplication(index)
  )
  const cycle = {
    accountingNotes: null,
    accountingSubmittedAt: null,
    accountingSubmittedByUser: null,
    accountingSubmittedByUserId: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    id: "cycle-1",
    operatingExpenseAmount: null,
    periodMonth: new Date("2026-08-01T00:00:00.000Z"),
    profitAmount: null,
    purchaseCostAmount: null,
    releasedAmount: 100_000,
    releasedAt: new Date("2026-08-01T00:00:00.000Z"),
    releasedByUser,
    releasedByUserId: releasedByUser.id,
    releaseNotes: "Committee release evidence.",
    salesAmount: null,
    status: "open",
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  }

  return {
    applicationQueries,
    countQueries,
    foodPurchaseApplication: {
      aggregate: async (args: any) => {
        applicationQueries.push(args)
        return {
          _sum: {
            approvedAmount: 130_000,
            paidAmount: 40_000,
            requestedAmount: 160_000,
          },
        }
      },
      count: async (args: any) => {
        countQueries.push(args)
        if (args.where.status) return 2
        if (args.where.OR) return 1
        return 31
      },
      findMany: async (args: any) => {
        applicationQueries.push(args)
        return applications.slice(0, args.take)
      },
    },
    foodPurchaseCycle: {
      findMany: async (args: any) => {
        expect(args.where).toEqual({ tenantId: "tenant-1" })
        return [cycle]
      },
    },
    tenant: { findUnique: async () => ({ currencyCode: "NGN" }) },
  }
}

describe("mobile admin Foodstuff Purchase operations workspace", () => {
  test("keeps reads tenant scoped, pages the queue, and exposes allocation shortfall", async () => {
    const prisma = createWorkspacePrisma()
    const workspace = await getMobileAdminFoodPurchaseWorkspace(
      {
        capabilities: {
          releaseFunds: true,
          reviewAccounting: true,
          reviewApplications: true,
          submitAccounting: true,
          view: true,
        },
        lane: "applications",
        search: "Amina",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    const pageQuery = prisma.applicationQueries.find(
      (query) => query.take === 31
    )
    expect(pageQuery.where).toMatchObject({
      cycleId: "cycle-1",
      tenantId: "tenant-1",
    })
    expect(pageQuery.where.OR).toBeArray()
    expect(workspace.applications).toHaveLength(30)
    expect(workspace.nextApplicationCursor).toBeString()
    expect(workspace.summary).toEqual({
      allocationShortfallAmount: 30_000,
      approvedAmount: 130_000,
      availableAmount: 0,
      outstandingAmount: 90_000,
      paidAmount: 40_000,
      pendingApplications: 2,
      requestedAmount: 160_000,
      totalApplications: 31,
    })
    expect(prisma.countQueries).toContainEqual({
      where: { cycleId: "cycle-1", tenantId: "tenant-1" },
    })
  })
})
