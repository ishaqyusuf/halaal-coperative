import { describe, expect, test } from "bun:test"
import { getMobileAdminFinancingOperationsWorkspace } from "./mobile-admin-financing-operations"

function createWorkspacePrisma() {
  const requestQueries: any[] = []
  const cycle = {
    id: "cycle-1",
    normalAllocationPercentage: 70,
    normalBudgetAmount: 700_000,
    periodEnd: new Date("2026-08-31T00:00:00.000Z"),
    periodStart: new Date("2026-08-01T00:00:00.000Z"),
    projectedCommitmentAmount: 1_000_000,
    quickAllocationPercentage: 30,
    quickBudgetAmount: 300_000,
    receivedContributionAmount: 800_000,
    reserveBufferAmount: 0,
    status: "open",
    totalCapacityAmount: 1_000_000,
  }
  const request = {
    approvals: [],
    availablePoolSnapshot: 1_000_000,
    eligibleAmountSnapshot: 400_000,
    guarantorApprovals: [
      {
        guarantorMember: {
          fullName: "Guarantor One",
          id: "member-guarantor",
          memberNumber: "M-002",
        },
        id: "guarantor-1",
        requestedAt: new Date("2026-08-10T00:00:00.000Z"),
        status: "pending",
      },
    ],
    id: "request-1",
    loan: null,
    loanProduct: {
      id: "product-1",
      isActive: true,
      loanType: "normal",
      name: "Normal financing",
      termMonths: 12,
    },
    loanProductId: "product-1",
    member: {
      fullName: "Amina Yusuf",
      id: "member-1",
      memberNumber: "M-001",
    },
    memberId: "member-1",
    requestedAmount: 300_000,
    requestedAt: new Date("2026-08-12T00:00:00.000Z"),
    requestedTermMonths: 12,
    status: "submitted",
    tenantId: "tenant-1",
  }
  return {
    requestQueries,
    contribution: {
      aggregate: async () => ({ _sum: { amount: 800_000 } }),
    },
    contributionPlan: {
      aggregate: async () => ({ _sum: { amount: 1_000_000 } }),
    },
    financingCycle: { findUnique: async () => cycle },
    loan: {
      aggregate: async (args: any) =>
        args._sum.outstandingPrincipal
          ? { _sum: { outstandingPrincipal: 100_000 } }
          : { _sum: { principalAmount: 0 } },
      findMany: async (args: any) =>
        args.select?.memberId ? [] : [],
    },
    loanRequest: {
      findMany: async (args: any) => {
        requestQueries.push(args)
        return args.include ? [request] : [
          {
            loanProduct: { loanType: "normal" },
            requestedAmount: 300_000,
            status: "submitted",
          },
        ]
      },
    },
    tenant: { findUnique: async () => ({ currencyCode: "NGN" }) },
    tenantPolicy: {
      findUnique: async () => ({
        requiresDualLoanApproval: true,
        reserveBufferAmount: 0,
      }),
    },
  }
}

describe("mobile admin financing operations workspace", () => {
  test("keeps the queue tenant-scoped and exposes guarantor and dual-approval evidence", async () => {
    const prisma = createWorkspacePrisma()
    const workspace = await getMobileAdminFinancingOperationsWorkspace(
      {
        capabilities: {
          disburse: true,
          manageCycle: true,
          review: true,
          view: true,
        },
        lane: "review",
        search: "Amina",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    const queueQuery = prisma.requestQueries.find((query) => query.include)
    expect(queueQuery.where).toMatchObject({
      status: { in: ["submitted", "under_review"] },
      tenantId: "tenant-1",
    })
    expect(workspace.items[0]).toMatchObject({
      actions: ["review"],
      blockers: ["1 guarantor response remains."],
      member: { name: "Amina Yusuf", number: "M-001" },
    })
    expect(workspace.items[0]?.evidence).toContain(
      "2 finance approvals remaining"
    )
    expect(workspace.cycle.normal.requestedReservedAmount).toBe(300_000)
  })
})
