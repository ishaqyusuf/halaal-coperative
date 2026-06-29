import { describe, expect, test } from "bun:test"
import { buildBackfillDraft } from "./generator"

describe("backfill draft generator", () => {
  test("uses loan-period savings and principal-only opening balance while a legacy loan is active", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 20000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [
        {
          code: "admin",
          label: "Admin",
          versions: [{ amount: 50, effectiveFrom: "2025-01" }],
        },
      ],
      defaultShareVersions: [{ amount: 100, effectiveFrom: "2025-01" }],
      endMonth: "2025-03",
      loanEvents: [
        {
          durationMonths: 2,
          loanAmount: 1200,
          loanPeriodSavingsContribution: 300,
          monthlyLoanServiceAmount: 500,
          openingOutstandingPrincipalBalance: 1000,
          startMonth: "2025-01",
          topUp: 300,
        },
      ],
      memberJoinedMonth: "2025-01",
      startMonth: "2025-01",
    })

    expect(draft.rows[0]).toMatchObject({
      amount: 800,
      loanService: 500,
      netDeposit: 150,
      pendingLoanPayment: 500,
    })
    expect(draft.rows[1]).toMatchObject({
      amount: 800,
      loanService: 500,
      pendingLoanPayment: 0,
    })
    expect(draft.rows[2]).toMatchObject({
      amount: 20000,
      loanService: 0,
    })
  })

  test("applies one-month savings and repayment adjustments during loan propagation", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 20000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [],
      defaultShareVersions: [{ amount: 0, effectiveFrom: "2025-01" }],
      endMonth: "2025-03",
      loanEvents: [
        {
          durationMonths: 3,
          id: "loan-a",
          loanAmount: 1200,
          loanPeriodSavingsContribution: 300,
          monthlyLoanServiceAmount: 500,
          openingOutstandingPrincipalBalance: 1200,
          startMonth: "2025-01",
          topUp: 300,
        },
      ],
      memberJoinedMonth: "2025-01",
      rowAdjustments: [
        {
          loanRepaymentOnTime: true,
          loanRepaymentAmount: 900,
          month: "2025-02",
          notes: "One-time catch-up",
          savingsContribution: 1000,
        },
      ],
      startMonth: "2025-01",
    })

    expect(draft.rows[1]).toMatchObject({
      amount: 1900,
      hasManualSavingsAdjustment: true,
      isEdited: true,
      loanRepaymentOnTime: true,
      loanService: 700,
      netDeposit: 1200,
      notes: "One-time catch-up",
      pendingLoanPayment: 0,
    })
    expect(draft.rows[2]?.pendingLoanPayment).toBe(0)
  })

  test("recalculates subsequent loan balances after a manual repayment underpayment", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 20000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [],
      defaultShareVersions: [{ amount: 0, effectiveFrom: "2025-01" }],
      endMonth: "2025-04",
      loanEvents: [
        {
          durationMonths: 4,
          id: "loan-a",
          loanAmount: 300000,
          loanPeriodSavingsContribution: 5000,
          monthlyLoanServiceAmount: 100000,
          openingOutstandingPrincipalBalance: 300000,
          startMonth: "2025-01",
          topUp: 5000,
        },
      ],
      memberJoinedMonth: "2025-01",
      rowAdjustments: [
        {
          loanRepaymentAmount: 50000,
          month: "2025-02",
          savingsContribution: 5000,
        },
      ],
      startMonth: "2025-01",
    })

    expect(
      draft.rows.map((row) => ({
        amount: row.amount,
        hasManualSavingsAdjustment: row.hasManualSavingsAdjustment,
        loanService: row.loanService,
        month: row.month,
        pendingLoanPayment: row.pendingLoanPayment,
      }))
    ).toEqual([
      {
        amount: 105000,
        hasManualSavingsAdjustment: undefined,
        loanService: 100000,
        month: "2025-01",
        pendingLoanPayment: 200000,
      },
      {
        amount: 55000,
        hasManualSavingsAdjustment: true,
        loanService: 50000,
        month: "2025-02",
        pendingLoanPayment: 150000,
      },
      {
        amount: 105000,
        hasManualSavingsAdjustment: undefined,
        loanService: 100000,
        month: "2025-03",
        pendingLoanPayment: 50000,
      },
      {
        amount: 105000,
        hasManualSavingsAdjustment: true,
        loanService: 50000,
        month: "2025-04",
        pendingLoanPayment: 0,
      },
    ])
  })

  test("calculates percentage share capital after charges during active loan months", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 10000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [
        {
          code: "admin",
          label: "Admin",
          versions: [{ amount: 100, effectiveFrom: "2025-01" }],
        },
      ],
      defaultShareVersions: [
        {
          amount: 10,
          basis: "after_charge_deductions",
          effectiveFrom: "2025-01",
          valueType: "percentage",
        },
      ],
      endMonth: "2025-02",
      loanEvents: [
        {
          durationMonths: 1,
          loanAmount: 1000,
          loanPeriodSavingsContribution: 3000,
          monthlyLoanServiceAmount: 500,
          startMonth: "2025-01",
          topUp: 3000,
        },
      ],
      memberJoinedMonth: "2025-01",
      startMonth: "2025-01",
    })

    expect(draft.rows[0]).toMatchObject({
      amount: 3500,
      loanService: 500,
      netDeposit: 2610,
      share: 290,
    })
    expect(draft.rows[1]).toMatchObject({
      amount: 10000,
      loanService: 0,
      netDeposit: 8910,
      share: 990,
    })
  })

  test("calculates percentage charges from loan-period savings before share capital", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 10000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [
        {
          code: "admin",
          frequency: "recurring_monthly",
          label: "Admin",
          versions: [
            {
              amount: 5,
              effectiveFrom: "2025-01",
              valueType: "percentage",
            },
          ],
        },
      ],
      defaultShareVersions: [
        {
          amount: 10,
          basis: "after_charge_deductions",
          effectiveFrom: "2025-01",
          valueType: "percentage",
        },
      ],
      endMonth: "2025-01",
      loanEvents: [
        {
          durationMonths: 1,
          loanAmount: 1000,
          loanPeriodSavingsContribution: 3000,
          monthlyLoanServiceAmount: 500,
          startMonth: "2025-01",
          topUp: 3000,
        },
      ],
      memberJoinedMonth: "2025-01",
      startMonth: "2025-01",
    })

    expect(draft.rows[0]).toMatchObject({
      chargeValues: { admin: 150 },
      netDeposit: 2565,
      share: 285,
    })
  })

  test("applies one-time charges only in their effective month and skips manual charges", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 5000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [
        {
          code: "entry",
          frequency: "one_time",
          label: "Entry",
          versions: [{ amount: 300, effectiveFrom: "2025-02" }],
        },
        {
          code: "manual",
          frequency: "manual",
          label: "Manual",
          versions: [{ amount: 999, effectiveFrom: "2025-01" }],
        },
      ],
      defaultShareVersions: [{ amount: 0, effectiveFrom: "2025-01" }],
      endMonth: "2025-03",
      memberJoinedMonth: "2025-01",
      startMonth: "2025-01",
    })

    expect(draft.rows.map((row) => row.chargeValues)).toEqual([
      { entry: 0, manual: 0 },
      { entry: 300, manual: 0 },
      { entry: 0, manual: 0 },
    ])
  })

  test("uses member share override before the default share capital plan", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 5000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [],
      defaultShareVersions: [{ amount: 100, effectiveFrom: "2025-01" }],
      endMonth: "2025-01",
      memberJoinedMonth: "2025-01",
      shareOverrideVersions: [
        {
          amount: 12,
          basis: "after_charge_deductions",
          effectiveFrom: "2025-01",
          valueType: "percentage",
        },
      ],
      startMonth: "2025-01",
    })

    expect(draft.rows[0]).toMatchObject({
      netDeposit: 4400,
      share: 600,
    })
  })
})
