import { describe, expect, test } from "bun:test"
import {
  getDashboardMetrics,
  getOverviewSummary,
  readOverviewKpis,
  readOverviewRecentActivity,
} from "./dashboard"
import { getTenantOperationProfile } from "./operation-profile"

function zeroAggregate(field = "amount") {
  return {
    _sum: {
      [field]: 0,
    },
  }
}

function createDashboardPrismaStub({
  openingSavingsBalance = 0,
  openingShareCapitalBalance = 0,
  pendingFoodPurchaseApplications = 0,
  pendingOpeningBalances = 0,
  pendingProjectFinancingRequests = 0,
  submittedFoodPurchaseAccounting = 0,
}: {
  openingSavingsBalance?: number
  openingShareCapitalBalance?: number
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
      aggregate: async () => ({
        _sum: {
          commitmentSavingsBalance: openingSavingsBalance,
          shareCapitalBalance: openingShareCapitalBalance,
        },
      }),
      count: async (input: any) =>
        input?.where?.status === "pending_review" ? pendingOpeningBalances : 0,
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
      findMany: async () => [],
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
      findUnique: async () => ({
        id: "operation-profile-1",
        reviewedAt: null,
        reviewedByUserId: null,
        tenantId: "tenant-1",
      }),
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

describe("deployable funds agreement (QA F1)", () => {
  test("overview and dashboard metrics use the shared member-funds snapshot", async () => {
    const prisma = createDashboardPrismaStub({
      openingSavingsBalance: 100000,
      openingShareCapitalBalance: 5000,
    })

    const [summary, metrics] = await Promise.all([
      getOverviewSummary("tenant-1", prisma as never),
      getDashboardMetrics("tenant-1", prisma as never),
    ])

    expect(metrics.availablePool).toBe(105000)
    expect(summary.primaryMetrics.deployableFunds).toBe(105000)
  })
})

describe("overview reads in one statement (L8)", () => {
  const scan = async () => {
    throw new Error("the overview must not read per KPI")
  }

  test("reads every KPI with one raw statement", async () => {
    const rawCalls: unknown[] = []
    const prisma = {
      $queryRaw: async (...args: unknown[]) => {
        rawCalls.push(args)
        return [
          {
            active_share_businesses: 2,
            currency_code: "NGN",
            draft_dividend_periods: 1,
            failed_imports: 3,
            financing_approvals: 4,
            initial_migration_status: "live_operations",
            kyc_reviews: 5,
            open_support_cases: 6,
            overdue_amount: "1500.50",
            overdue_items: 7,
            par30_amount: "900",
            par60_amount: "400.25",
            par90_amount: "0",
            pending_disbursements: 8,
            pending_document_reviews: 9,
            pending_food_purchase_applications: 10,
            pending_member_approvals: 11,
            pending_opening_balances: 12,
            pending_payment_receipts: 13,
            pending_procurement_requests: 14,
            pending_profit_entry_amount: "250",
            pending_project_financing_requests: 15,
            pending_share_allocation_amount: null,
            pending_share_applications: 16,
            share_capital_balance: "10000",
            submitted_food_purchase_accounting: 17,
            tenant_name: "Demo Cooperative",
          },
        ]
      },
      loan: { count: scan },
      member: { count: scan },
      repaymentScheduleItem: { findMany: scan },
      tenant: { findUnique: scan },
    }

    const kpis = await readOverviewKpis(
      prisma as never,
      "tenant-1",
      new Date("2026-11-16T09:00:00.000Z")
    )

    expect(rawCalls).toHaveLength(1)
    expect(kpis).toEqual({
      activeShareBusinesses: 2,
      draftDividendPeriods: 1,
      failedImportCount: 3,
      financingApprovalCount: 4,
      kycReviewCount: 5,
      openSupportCases: 6,
      overdueAmount: 1500.5,
      overdueItemCount: 7,
      par30Amount: 900,
      par60Amount: 400.25,
      par90Amount: 0,
      pendingDisbursementCount: 8,
      pendingDocumentReviews: 9,
      pendingFoodPurchaseApplications: 10,
      pendingMemberApprovals: 11,
      pendingOpeningBalances: 12,
      pendingPaymentReceipts: 13,
      pendingProcurementRequests: 14,
      pendingProfitEntryAmount: 250,
      pendingProjectFinancingRequests: 15,
      pendingShareAllocationAmount: 0,
      pendingShareApplications: 16,
      shareCapitalBalance: 10000,
      submittedFoodPurchaseAccounting: 17,
      tenant: {
        currencyCode: "NGN",
        initialMigrationStatus: "live_operations",
        name: "Demo Cooperative",
      },
    })
  })

  test("reads a missing tenant as null", async () => {
    const prisma = {
      $queryRaw: async () => [
        {
          currency_code: null,
          initial_migration_status: null,
          tenant_name: null,
        },
      ],
    }

    const kpis = await readOverviewKpis(prisma as never, "missing", new Date())

    expect(kpis.tenant).toBeNull()
  })

  test("reads recent activity and member names with one raw statement", async () => {
    const rawCalls: unknown[] = []
    const occurredAt = new Date("2026-11-15T10:00:00.000Z")
    const prisma = {
      $queryRaw: async (...args: unknown[]) => {
        rawCalls.push(args)
        return [
          {
            amount: "5000",
            id: "c-1",
            kind: "contribution",
            member_name: "Amina Bello",
            occurred_at: occurredAt,
            status: null,
          },
          {
            amount: null,
            id: "r-1",
            kind: "loan_request",
            member_name: null,
            occurred_at: occurredAt,
            status: "under_review",
          },
        ]
      },
      contribution: { findMany: scan },
      loanRequest: { findMany: scan },
      member: { findMany: scan },
      repayment: { findMany: scan },
    }

    const rows = await readOverviewRecentActivity(prisma as never, "tenant-1")

    expect(rawCalls).toHaveLength(1)
    expect(rows).toEqual([
      {
        amount: 5000,
        id: "c-1",
        kind: "contribution",
        memberName: "Amina Bello",
        occurredAt,
        status: null,
      },
      {
        amount: null,
        id: "r-1",
        kind: "loan_request",
        memberName: null,
        occurredAt,
        status: "under_review",
      },
    ])
  })

  test("reuses the operation profile the caller already has", async () => {
    const profile = await getTenantOperationProfile(
      "tenant-1",
      createDashboardPrismaStub() as never
    )
    const prisma = {
      ...createDashboardPrismaStub({ pendingOpeningBalances: 2 }),
      tenantOperationProfile: { findUnique: scan, upsert: scan },
      tenantServiceSetting: { findMany: scan, upsert: scan },
    }

    const summary = await getOverviewSummary("tenant-1", prisma as never, {
      operationProfile: Promise.resolve(profile),
    })

    expect(summary.actionQueue).toContainEqual({
      count: 2,
      href: "/members",
      key: "opening-balances",
      label: "Opening balance reviews",
      severity: "warning",
    })
  })
})
