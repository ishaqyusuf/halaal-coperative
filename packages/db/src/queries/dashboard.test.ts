import { describe, expect, test } from "bun:test"
import { getOverviewSummary } from "./dashboard"

function zeroAggregate(field = "amount") {
  return {
    _sum: {
      [field]: 0,
    },
  }
}

function createDashboardPrismaStub({
  pendingFoodPurchaseApplications = 0,
  pendingOpeningBalances = 0,
  pendingProjectFinancingRequests = 0,
  submittedFoodPurchaseAccounting = 0,
}: {
  pendingFoodPurchaseApplications?: number
  pendingOpeningBalances?: number
  pendingProjectFinancingRequests?: number
  submittedFoodPurchaseAccounting?: number
} = {}) {
  return {
    chargeApplication: {
      aggregate: async () => zeroAggregate("amount"),
    },
    contribution: {
      aggregate: async () => zeroAggregate("amount"),
      findMany: async () => [],
    },
    contributionPlan: {
      aggregate: async () => zeroAggregate("amount"),
    },
    dividendPeriod: {
      count: async () => 0,
    },
    financingCycle: {
      findUnique: async () => null,
    },
    foodPurchaseApplication: {
      count: async (input: any) =>
        input?.where?.status?.in?.includes("submitted")
          ? pendingFoodPurchaseApplications
          : 0,
    },
    foodPurchaseCycle: {
      count: async (input: any) =>
        input?.where?.status === "accounting_submitted"
          ? submittedFoodPurchaseAccounting
          : 0,
    },
    importBatch: {
      count: async () => 0,
    },
    loan: {
      aggregate: async (input: any) =>
        input?._sum?.principalAmount
          ? zeroAggregate("principalAmount")
          : zeroAggregate("outstandingPrincipal"),
      count: async () => 0,
      findMany: async () => [],
    },
    loanRequest: {
      count: async () => 0,
      findMany: async () => [],
    },
    member: {
      count: async () => 0,
    },
    memberDocument: {
      count: async () => 0,
    },
    memberOnboardingRequest: {
      count: async () => 0,
    },
    memberOpeningBalance: {
      count: async (input: any) =>
        input?.where?.status === "pending_review"
          ? pendingOpeningBalances
          : 0,
    },
    memberPaymentReceipt: {
      count: async () => 0,
    },
    memberShareApplication: {
      count: async () => 0,
    },
    memberShareLedgerEntry: {
      aggregate: async () => zeroAggregate("amount"),
    },
    monthlyRecord: {
      findFirst: async () => null,
    },
    procurementRequest: {
      count: async () => 0,
    },
    projectFinancingRequest: {
      count: async (input: any) =>
        input?.where?.status?.in?.includes("submitted")
          ? pendingProjectFinancingRequests
          : 0,
    },
    repayment: {
      findMany: async () => [],
    },
    repaymentScheduleItem: {
      count: async () => 0,
      findMany: async () => [],
    },
    shareBusiness: {
      count: async () => 0,
    },
    shareBusinessProfitEntry: {
      aggregate: async () => zeroAggregate("allocatableProfitAmount"),
    },
    shareProfitAllocation: {
      aggregate: async () => zeroAggregate("allocatedProfitAmount"),
    },
    supportCase: {
      count: async () => 0,
    },
    tenant: {
      findUnique: async () => ({
        currencyCode: "NGN",
        id: "tenant-1",
        initialMigrationStatus: "member_migration_in_progress",
        name: "Demo Cooperative",
      }),
    },
    tenantOperationProfile: {
      upsert: async () => ({
        id: "operation-profile-1",
        reviewedAt: null,
        reviewedByUserId: null,
        tenantId: "tenant-1",
      }),
    },
    tenantPolicy: {
      findUnique: async () => ({
        foodPurchaseMaximumActiveObligationsPerMember: 1,
        foodPurchaseRequiresOpenCycle: true,
        normalLoanAllocationPercentage: 70,
        procurementMaximumActiveObligationsPerMember: 1,
        quickLoanAllocationPercentage: 30,
        reserveBufferAmount: 0,
      }),
    },
    tenantServiceSetting: {
      findMany: async () => [],
      upsert: async () => ({}),
    },
  }
}

describe("overview summary", () => {
  test("includes pending opening balance reviews in the action queue", async () => {
    const summary = await getOverviewSummary(
      "tenant-1",
      createDashboardPrismaStub({ pendingOpeningBalances: 3 }) as never
    )

    expect(summary.actionQueue).toContainEqual({
      count: 3,
      href: "/members",
      key: "opening-balances",
      label: "Opening balance reviews",
      severity: "warning",
    })
    expect(summary.primaryMetrics.actionQueueTotal).toBeGreaterThanOrEqual(3)
  })

  test("includes food purchase applications and accounting in the action queue", async () => {
    const summary = await getOverviewSummary(
      "tenant-1",
      createDashboardPrismaStub({
        pendingFoodPurchaseApplications: 2,
        submittedFoodPurchaseAccounting: 1,
      }) as never
    )

    expect(summary.actionQueue).toContainEqual({
      count: 2,
      href: "/food-purchase",
      key: "food-purchase-applications",
      label: "Foodstuff Purchase applications",
      severity: "warning",
    })
    expect(summary.actionQueue).toContainEqual({
      count: 1,
      href: "/food-purchase",
      key: "food-purchase-accounting",
      label: "Foodstuff Purchase accounting",
      severity: "warning",
    })
    expect(summary.primaryMetrics.actionQueueTotal).toBeGreaterThanOrEqual(3)
  })

  test("includes pending project financing requests in the action queue", async () => {
    const summary = await getOverviewSummary(
      "tenant-1",
      createDashboardPrismaStub({
        pendingProjectFinancingRequests: 4,
      }) as never
    )

    expect(summary.actionQueue).toContainEqual({
      count: 4,
      href: "/project-financing",
      key: "project-financing-requests",
      label: "Project financing requests",
      severity: "warning",
    })
    expect(summary.primaryMetrics.actionQueueTotal).toBeGreaterThanOrEqual(4)
  })
})
