import { describe, expect, test } from "bun:test"
import {
  calculateMobileAdminChargeAmount,
  getMobileAdminChargeApplication,
  getMobileAdminChargeDuplicateStrategy,
  getMobileAdminChargeWorkspace,
} from "./mobile-admin-charge-operations"

function application(id: string, tenantId = "tenant-a") {
  return {
    amount: 5_000,
    assessedAt: new Date("2026-08-10T00:00:00.000Z"),
    chargeApplicability: {
      trigger: "monthly_collection",
      workflow: "commitment_collection",
    },
    chargeDefinition: {
      chargeFrequency: "recurring_monthly",
      chargeValueType: "fixed_amount",
      code: "MONTHLY-LEVY",
      isMonthlyLevy: true,
      name: "Monthly levy",
      purpose: "general",
    },
    collectionMode: "deduct_from_savings",
    contributionId: null,
    foodPurchaseApplication: null,
    id,
    loan: null,
    loanRequest: null,
    member: {
      fullName: "Maryam Sule",
      id: "member-a",
      memberNumber: "HVC-QA-0044",
    },
    memberId: "member-a",
    notes: null,
    procurementRequest: null,
    projectFinancingRequest: null,
    status: "posted",
    tenantId,
  }
}

function createWorkspacePrisma(rows: any[]) {
  const findManyCalls: any[] = []
  return {
    auditLog: { findMany: async () => [] },
    chargeApplication: {
      aggregate: async () => ({ _sum: { amount: 0 } }),
      count: async () => 0,
      findFirst: async () => null,
      findMany: async (input: any) => {
        findManyCalls.push(input)
        return rows
      },
    },
    tenant: {
      findUnique: async () => ({ currencyCode: "NGN" }),
    },
    findManyCalls,
  }
}

describe("mobile admin charge operations policy", () => {
  test("calculates fixed and percentage charges from server inputs", () => {
    expect(
      calculateMobileAdminChargeAmount({
        chargeValueType: "fixed_amount",
        rate: 7_500,
      })
    ).toBe(7_500)
    expect(
      calculateMobileAdminChargeAmount({
        basisAmount: 600_000,
        chargeValueType: "percentage",
        rate: 2,
      })
    ).toBe(12_000)
  })

  test("keeps recurring, per-contribution, one-time, and manual duplicate rules explicit", () => {
    expect(
      getMobileAdminChargeDuplicateStrategy({
        chargeFrequency: "recurring_monthly",
        isMonthlyLevy: true,
      })
    ).toBe("member_definition_period")
    expect(
      getMobileAdminChargeDuplicateStrategy({
        chargeFrequency: "one_time",
        isMonthlyLevy: false,
      })
    ).toBe("member_definition_forever")
    expect(
      getMobileAdminChargeDuplicateStrategy({
        chargeFrequency: "per_contribution",
        isMonthlyLevy: false,
      })
    ).toBe("none")
    expect(
      getMobileAdminChargeDuplicateStrategy({
        chargeFrequency: "manual",
        isMonthlyLevy: false,
      })
    ).toBe("none")
  })

  test("binds every application filter and cursor page to the requested tenant", async () => {
    const rows = Array.from({ length: 31 }, (_, index) =>
      application(`application-${index}`)
    )
    const prisma = createWorkspacePrisma(rows)
    const result = await getMobileAdminChargeWorkspace(
      {
        capabilities: { correct: true, manage: true, view: true },
        cursor: "prior-cursor",
        filters: {
          collectionMode: "deduct_from_savings",
          memberId: "member-a",
          purpose: "general",
          status: "posted",
          workflow: "commitment_collection",
        },
        lane: "applications",
        search: "Maryam",
        tenantId: "tenant-a",
      },
      prisma as never
    )

    expect(prisma.findManyCalls[0]).toMatchObject({
      cursor: { id: "prior-cursor" },
      skip: 1,
      take: 31,
      where: {
        collectionMode: "deduct_from_savings",
        memberId: "member-a",
        status: "posted",
        tenantId: "tenant-a",
      },
    })
    expect(result.data).toHaveLength(30)
    expect(result.nextCursor).toBe("application-29")
  })

  test("resolves the immutable effective version and percentage basis for detail", async () => {
    const row = application("application-detail") as any
    row.amount = 12_000
    row.chargeDefinition = {
      ...row.chargeDefinition,
      chargeValueType: "percentage",
      versions: [
        {
          amount: 3,
          chargeValueType: "percentage",
          effectiveFrom: new Date("2026-09-01T00:00:00.000Z"),
          id: "future-version",
        },
        {
          amount: 2,
          chargeValueType: "percentage",
          effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
          id: "effective-version",
        },
      ],
    }
    row.ledgerTransaction = null
    const prisma = {
      auditLog: { findMany: async () => [] },
      chargeApplication: { findFirst: async () => row },
    }

    const result = await getMobileAdminChargeApplication(
      { applicationId: row.id, tenantId: "tenant-a" },
      prisma as never
    )

    expect(result.definition.versionId).toBe("effective-version")
    expect(result.definition.effectiveAmount).toBe(2)
    expect(result.amountBasis).toBe(600_000)
  })
})
