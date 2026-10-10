import { describe, expect, test } from "bun:test"
import { getMobileAdminProjectFinancingWorkspace } from "./mobile-admin-project-financing-operations"

function projectRow(input: {
  approvedAmount: number
  approvedStructure: "investment_partnership" | "repayable_facility"
  businessName: string
  disbursedAt?: Date | null
  id: string
  paidAmount?: number
  status: "active" | "approved"
}) {
  const createdAt = new Date("2026-08-20T10:00:00.000Z")
  return {
    approvedAmount: input.approvedAmount,
    approvedMonthlyPayback:
      input.approvedStructure === "repayable_facility" ? 150000 : null,
    approvedPaybackMonths:
      input.approvedStructure === "repayable_facility" ? 20 : null,
    approvedStructure: input.approvedStructure,
    businessDescription: null,
    businessName: input.businessName,
    createdAt,
    createdByUser: {
      email: "staff@example.com",
      fullName: "Finance Officer",
      id: "user-1",
    },
    createdByUserId: "user-1",
    disbursedAt: input.disbursedAt ?? null,
    disbursedByUser: null,
    disbursedByUserId: null,
    disbursementNotes: null,
    disbursementReference: null,
    estimatedMonthlyPayback: null,
    id: input.id,
    member: {
      email: "member@example.com",
      fullName: "Aisha Member",
      id: "member-1",
      memberNumber: "M-001",
    },
    memberId: "member-1",
    paidAmount: input.paidAmount ?? 0,
    paidAt: null,
    projectPurpose: null,
    proposedStructure: input.approvedStructure,
    requestedAmount: input.approvedAmount,
    requestedAt: createdAt,
    requestedPaybackMonths: null,
    reviewedAt: createdAt,
    reviewedByUser: {
      email: "reviewer@example.com",
      fullName: "Reviewer",
      id: "user-2",
    },
    reviewedByUserId: "user-2",
    reviewNotes: "Approved by committee.",
    status: input.status,
    tenantId: "tenant-1",
    updatedAt: createdAt,
  }
}

describe("mobile admin project financing workspace", () => {
  test("keeps repayable principal separate from partnership evidence", async () => {
    const rows = [
      projectRow({
        approvedAmount: 3_000_000,
        approvedStructure: "repayable_facility",
        businessName: "Northline Cold Store",
        id: "project-1",
        status: "approved",
      }),
      projectRow({
        approvedAmount: 1_000_000,
        approvedStructure: "investment_partnership",
        businessName: "Safiya Trading",
        id: "project-2",
        status: "active",
      }),
    ]
    const prisma = {
      projectFinancingRequest: {
        aggregate: async (args: any) => {
          if (args._sum.requestedAmount) {
            return { _sum: { requestedAmount: 4_000_000 } }
          }
          if (
            args._sum.approvedAmount &&
            args.where.approvedStructure === "repayable_facility"
          ) {
            return { _sum: { approvedAmount: 3_000_000 } }
          }
          if (args._sum.approvedAmount) {
            return { _sum: { approvedAmount: 4_000_000 } }
          }
          return { _sum: { paidAmount: 1_200_000 } }
        },
        count: async (args: any) => {
          const status = args.where?.status
          if (status === "active" && args.where.disbursedAt === null) return 1
          if (status === "active") return 1
          if (status === "approved") return 1
          if (status === "rejected") return 0
          if (status?.in?.includes("submitted")) return 2
          if (status?.in?.includes("completed")) return 2
          return rows.length
        },
        findMany: async () => rows,
      },
      tenant: {
        findUnique: async () => ({ currencyCode: "NGN" }),
      },
    }

    const workspace = await getMobileAdminProjectFinancingWorkspace(
      {
        capabilities: {
          activate: true,
          recordDisbursement: true,
          review: true,
          view: true,
        },
        lane: "needs_action",
        tenantId: "tenant-1",
      },
      prisma as never
    )

    expect(workspace.summary).toMatchObject({
      blockedCount: 2,
      outstandingPrincipal: 1_800_000,
      readyCount: 2,
      totalProjects: 2,
    })
    expect(workspace.projects[0]).toMatchObject({
      allowedActions: ["activate"],
      boundary: "repayable_principal",
      outstandingPrincipal: 3_000_000,
    })
    expect(workspace.projects[1]).toMatchObject({
      allowedActions: ["record_disbursement"],
      boundary: "evidence_only",
      outstandingPrincipal: null,
      paidAmount: null,
    })
  })
})
