import { describe, expect, test } from "bun:test"
import { getMobileAdminShareProfitWorkspace } from "./mobile-admin-share-profit-governance"

const capabilities = {
  approveProfit: true,
  publishProfit: true,
  reviewShares: true,
  view: true,
}

function sharePrisma(configurationMode: "monthly_history" | "unit_based") {
  const now = new Date("2026-08-30T10:00:00.000Z")
  const application = {
    approvedUnits: null,
    createdAt: now,
    id: "10000000-0000-4000-8000-000000000001",
    member: {
      email: "member@example.com",
      fullName: "Amina Yusuf",
      memberNumber: "MEM-001",
    },
    memberId: "20000000-0000-4000-8000-000000000001",
    notes: "Long-term ownership",
    requestedByUserId: null,
    requestedUnits: 3,
    reviewedAt: null,
    reviewedByUserId: null,
    reviewNotes: null,
    shareValueSnapshot: 30_000,
    status: "pending",
    unitAmountSnapshot: 10_000,
  }
  return {
    memberShareApplication: {
      aggregate: async () => ({ _sum: { requestedUnits: 3 } }),
      count: async () => 1,
      findMany: async () => [application],
    },
    memberShareLedgerEntry: {
      aggregate: async () => ({ _sum: { amount: 6_800_000 } }),
      count: async () => 12,
      findMany: async () => [
        {
          amount: 20_000,
          createdAt: now,
          effectiveDate: now,
          id: "30000000-0000-4000-8000-000000000001",
          member: {
            fullName: "Fatima Bello",
            id: "20000000-0000-4000-8000-000000000002",
            memberNumber: "MEM-002",
          },
          notes: "Approved optional share application",
          sourceType: "share_application",
        },
      ],
    },
    tenant: { findUnique: async () => ({ currencyCode: "NGN" }) },
    tenantPolicy: {
      findUnique: async () => ({
        compulsoryShareUnits: 1,
        id: "40000000-0000-4000-8000-000000000001",
        maximumShareUnits: 20,
        shareConfigurationMode: configurationMode,
        shareUnitAmount: 10_000,
      }),
    },
  }
}

describe("mobile admin share and profit governance workspace", () => {
  test.each(["monthly_history", "unit_based"] as const)(
    "distinguishes the %s share model",
    async (configurationMode) => {
      const workspace = await getMobileAdminShareProfitWorkspace(
        {
          book: "shares",
          capabilities,
          tenantId: "tenant-1",
        },
        sharePrisma(configurationMode) as never
      )

      expect(workspace.shares?.policy.configurationMode).toBe(configurationMode)
      expect(workspace.shares?.summary).toMatchObject({
        pendingCount: 1,
        pendingUnits: 3,
        postedCapital: 6_800_000,
      })
      expect(workspace.shares?.applications[0]?.allowedActions).toEqual(
        configurationMode === "unit_based" ? ["review"] : []
      )
    }
  )

  test("exposes approval only when reviewed allocations reconcile", async () => {
    const now = new Date("2026-08-30T10:00:00.000Z")
    const prisma = {
      dividendPeriod: {
        aggregate: async () => ({ _sum: { distributableAmount: 810_000 } }),
        count: async () => 1,
        findMany: async () => [
          {
            createdAt: now,
            deductionAmount: 50_000,
            deductionReason: "Reserve",
            distributableAmount: 810_000,
            id: "50000000-0000-4000-8000-000000000001",
            name: "2026 annual profit",
            periodEnd: now,
            periodStart: new Date("2026-01-01T00:00:00.000Z"),
            publishedAt: null,
            shareBusinessProfitEntries: [
              {
                allocatableProfitAmount: 810_000,
                allocations: [
                  {
                    allocatedProfitAmount: 810_000,
                    status: "draft",
                  },
                ],
                expenseAmount: 100_000,
                id: "60000000-0000-4000-8000-000000000001",
                profitAmount: 960_000,
                profitDate: now,
                reason: null,
                shareBusiness: { name: "Retail pool" },
                sourceType: "manual",
                status: "reviewed",
              },
            ],
            status: "approved",
            totalProfitAmount: 960_000,
          },
        ],
      },
      shareBusinessProfitEntry: {
        count: async (input: any) =>
          input.where.status === "reviewed" ? 1 : 0,
      },
      tenant: { findUnique: async () => ({ currencyCode: "NGN" }) },
    }

    const workspace = await getMobileAdminShareProfitWorkspace(
      { book: "profit", capabilities, tenantId: "tenant-1" },
      prisma as never
    )

    expect(workspace.profit?.periods[0]?.entries[0]).toMatchObject({
      allocationsReconcile: true,
      allowedActions: ["approve"],
      blocker: null,
    })
    expect(workspace.profit?.summary).toEqual({
      pendingApprovalCount: 1,
      readyToPublishCount: 0,
      unpublishedAmount: 810_000,
    })
  })
})
