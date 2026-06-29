import { describe, expect, test } from "bun:test"
import { buildBackfillDraftInputForMember } from "./backfill"

function createBackfillInputPrismaStub() {
  return {
    chargeApplication: {
      findMany: async () => [],
    },
    chargeDefinition: {
      findMany: async () => [
        {
          chargeFrequency: "per_contribution",
          chargeValueType: "percentage",
          code: "admin",
          name: "Admin",
          versions: [
            {
              amount: 5,
              chargeValueType: "percentage",
              effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
              kind: "percentage",
            },
          ],
        },
      ],
    },
    contribution: {
      findMany: async () => [],
    },
    dividendAllocation: {
      findMany: async () => [],
    },
    legacyLoanMigrationDraft: {
      findMany: async () => [
        {
          closedAt: null,
          id: "draft-1",
          loanLabel: "Loan A",
          openedAt: new Date("2025-08-01T00:00:00.000Z"),
          outstandingPrincipalBalance: 65000,
          principalAmount: 120000,
          savingsDuringLoan: 5000,
          scheduledMonthlyPrincipalRepayment: 10000,
        },
      ],
    },
    member: {
      findFirst: async () => ({
        id: "member-1",
        joinedAt: new Date("2025-01-15T00:00:00.000Z"),
        tenant: {
          startDate: new Date("2025-01-01T00:00:00.000Z"),
        },
      }),
    },
    memberAmountLog: {
      findMany: async () => [],
    },
    memberShareOverride: {
      findMany: async () => [
        {
          amount: 12,
          basis: "after_charge_deductions",
          effectiveFrom: new Date("2025-06-01T00:00:00.000Z"),
          notes: "Member plan",
          valueType: "percentage",
        },
      ],
    },
    migrationBackfillAdjustment: {
      findMany: async () => [
        {
          loanRepaymentOnTime: true,
          loanRepaymentAmount: 900,
          month: new Date("2025-09-01T00:00:00.000Z"),
          notes: "Catch-up",
          savingsContribution: 1000,
        },
      ],
    },
    migrationProfitAdjustment: {
      findMany: async () => [
        {
          allocatedProfitAmount: null,
          profitEntryId: "profit-entry-1",
          profitEntry: {
            id: "profit-entry-1",
            profitAmount: 100000,
            profitDate: new Date("2025-04-30T00:00:00.000Z"),
            shareBusiness: {
              name: "Retail pool",
            },
          },
          sharePercentage: 5,
        },
      ],
    },
    repayment: {
      findMany: async () => [],
    },
    shareBusiness: {
      findMany: async () => [],
    },
    shareBusinessProfitEntry: {
      findMany: async () => [
        {
          allocatableProfitAmount: 80000,
          profitAmount: 100000,
          profitDate: new Date("2025-04-30T00:00:00.000Z"),
          reason: "Board-approved distribution",
          shareBusiness: {
            name: "Retail pool",
          },
        },
      ],
    },
    tenantShareStructureVersion: {
      findMany: async () => [
        {
          amount: 10,
          basis: "after_charge_deductions",
          effectiveFrom: new Date("2025-01-01T00:00:00.000Z"),
          notes: "Default plan",
          valueType: "percentage",
        },
      ],
    },
  }
}

describe("member backfill input builder", () => {
  test("starts generated ledger range at first saving history by default", async () => {
    const input = await buildBackfillDraftInputForMember(
      {
        endMonth: new Date("2026-02-01T00:00:00.000Z"),
        memberId: "member-1",
        tenantId: "tenant-1",
      },
      {
        ...createBackfillInputPrismaStub(),
        memberAmountLog: {
          findMany: async () => [
            {
              amount: 5000,
              effectiveFrom: new Date("2025-05-01T00:00:00.000Z"),
              notes: "First saving history",
            },
            {
              amount: 7500,
              effectiveFrom: new Date("2025-09-01T00:00:00.000Z"),
              notes: "Updated saving history",
            },
          ],
        },
      } as never
    )

    expect(input.startMonth).toBe("2025-05")
    expect(input.amountLogs).toEqual([
      {
        amount: 5000,
        effectiveFrom: "2025-05",
        notes: "First saving history",
      },
      {
        amount: 7500,
        effectiveFrom: "2025-09",
        notes: "Updated saving history",
      },
    ])
  })

  test("maps legacy loan migration drafts into backfill loan events", async () => {
    const input = await buildBackfillDraftInputForMember(
      {
        endMonth: new Date("2026-02-01T00:00:00.000Z"),
        memberId: "member-1",
        tenantId: "tenant-1",
      },
      createBackfillInputPrismaStub() as never
    )

    expect(input.loanEvents).toEqual([
      {
        durationMonths: 7,
        id: "draft-1",
        label: "Loan A",
        loanAmount: 120000,
        loanPeriodSavingsContribution: 5000,
        monthlyLoanServiceAmount: 10000,
        openingOutstandingPrincipalBalance: 65000,
        startMonth: "2025-08",
        topUp: 5000,
      },
    ])
    expect(input.rowAdjustments).toEqual([
      {
        loanRepaymentOnTime: true,
        loanRepaymentAmount: 900,
        month: "2025-09",
        notes: "Catch-up",
        savingsContribution: 1000,
      },
    ])
    expect(input.dividendEntries).toEqual([
      {
        amount: 5000,
        label: "Retail pool profit",
        month: "2025-04",
        profitEntryId: "profit-entry-1",
        sharePercentage: 5,
      },
    ])
    expect(input.chargeDefinitions).toEqual([
      {
        code: "admin",
        frequency: "per_contribution",
        label: "Admin",
        versions: [
          {
            amount: 5,
            effectiveFrom: "2025-01",
            valueType: "percentage",
          },
        ],
      },
    ])
    expect(input.defaultShareVersions).toEqual([
      {
        amount: 10,
        basis: "after_charge_deductions",
        effectiveFrom: "2025-01",
        notes: "Default plan",
        valueType: "percentage",
      },
    ])
    expect(input.shareOverrideVersions).toEqual([
      {
        amount: 12,
        basis: "after_charge_deductions",
        effectiveFrom: "2025-06",
        notes: "Member plan",
        valueType: "percentage",
      },
    ])
    expect(input.profitPeriods).toEqual([
      {
        distributableAmount: 80000,
        month: "2025-04",
        notes: "Board-approved distribution",
        totalProfitAmount: 100000,
      },
    ])
  })
})
