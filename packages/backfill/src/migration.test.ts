import { describe, expect, test } from "bun:test"
import {
  calculateNetSavingsContribution,
  calculateOutstandingLoanPrincipalBalance,
  groupRowsByEffectiveDateSegment,
  projectBackfillDraftToMemberLedgerRows,
} from "./migration"
import { buildBackfillDraft } from "./generator"
import type { MemberLedgerBackfillRow } from "./types"

const baseRow = {
  chargeDeductions: { "Admin levy": 100 },
  dividendCredit: 0,
  grossContribution: 5000,
  isEdited: false,
  loanColumns: [],
  netSavingsContribution: 4800,
  runningSavingsBalance: 4800,
  runningShareCapitalBalance: 100,
  savingsContribution: 5000,
  shareCapitalContribution: 100,
} satisfies Omit<MemberLedgerBackfillRow, "effectiveDateSegmentKey" | "period">

describe("initial migration backfill helpers", () => {
  test("calculates outstanding principal without mixing in fees or charges", () => {
    expect(
      calculateOutstandingLoanPrincipalBalance({
        principalAmount: 120000,
        principalRepayments: 55000,
      }),
    ).toBe(65000)

    expect(
      calculateOutstandingLoanPrincipalBalance({
        principalAmount: 120000,
        principalRepayments: 150000,
      }),
    ).toBe(0)
  })

  test("calculates net savings after charges and share capital", () => {
    expect(
      calculateNetSavingsContribution({
        chargeDeductions: 250,
        grossContribution: 5000,
        shareCapitalContribution: 150,
      }),
    ).toBe(4600)
  })

  test("groups member ledger rows by effective-date segment", () => {
    const rows: MemberLedgerBackfillRow[] = [
      {
        ...baseRow,
        effectiveDateSegmentKey: "loan-active",
        loanColumns: [
          {
            id: "loan-a",
            label: "Loan A",
            outstandingPrincipalBalance: 110000,
            repaymentAmount: 10000,
          },
        ],
        period: "Aug 2025",
      },
      {
        ...baseRow,
        effectiveDateSegmentKey: "loan-active",
        loanColumns: [
          {
            id: "loan-a",
            label: "Loan A",
            outstandingPrincipalBalance: 100000,
            repaymentAmount: 10000,
          },
        ],
        period: "Sep 2025",
      },
      {
        ...baseRow,
        effectiveDateSegmentKey: "loan-settled",
        period: "May 2026",
      },
    ]

    expect(groupRowsByEffectiveDateSegment(rows)).toEqual([
      {
        key: "loan-active",
        label: "loan-active",
        rows: [rows[0], rows[1]],
        summary: {
          chargeLabels: ["Admin levy"],
          hasLegacyLoan: true,
          rowCount: 2,
        },
      },
      {
        key: "loan-settled",
        label: "loan-settled",
        rows: [rows[2]],
        summary: {
          chargeLabels: ["Admin levy"],
          hasLegacyLoan: false,
          rowCount: 1,
        },
      },
    ])
  })

  test("projects generated backfill draft rows into segmented member ledger rows", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 15000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [
        {
          code: "admin",
          label: "Admin levy",
          versions: [{ amount: 100, effectiveFrom: "2025-01" }],
        },
      ],
      defaultShareVersions: [{ amount: 250, effectiveFrom: "2025-01" }],
      dividendEntries: [
        {
          amount: 1200,
          label: "Retail pool profit",
          month: "2025-03",
          profitEntryId: "profit-entry-1",
          sharePercentage: 10,
        },
      ],
      endMonth: "2025-03",
      loanEvents: [
        {
          durationMonths: 2,
          id: "loan-a",
          label: "Loan A",
          loanAmount: 120000,
          loanPeriodSavingsContribution: 5000,
          monthlyLoanServiceAmount: 10000,
          openingOutstandingPrincipalBalance: 20000,
          startMonth: "2025-01",
          topUp: 5000,
        },
      ],
      memberJoinedMonth: "2025-01",
      rowAdjustments: [
        {
          loanRepaymentOnTime: true,
          month: "2025-01",
        },
        {
          loanRepaymentOnTime: true,
          month: "2025-02",
        },
      ],
      startMonth: "2025-01",
    })

    const rows = projectBackfillDraftToMemberLedgerRows(draft)
    const segments = groupRowsByEffectiveDateSegment(rows)

    expect(rows[0]).toMatchObject({
      loanColumns: [
        {
          id: "loan-a",
          label: "Loan A",
          outstandingPrincipalBalance: 10000,
          repaymentOnTime: true,
          repaymentAmount: 10000,
        },
      ],
      netSavingsContribution: 4650,
      savingsContribution: 5000,
    })
    expect(rows[1]?.loanColumns[0]?.outstandingPrincipalBalance).toBe(0)
    expect(rows[2]).toMatchObject({
      dividendCredit: 1200,
      dividendLabel: "Retail pool profit",
      dividendProfitEntryId: "profit-entry-1",
      loanColumns: [],
      savingsContribution: 15000,
    })
    expect(segments).toHaveLength(2)
  })

  test("splits member ledger projection when a one-time repayment adjustment creates drift", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 15000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [],
      defaultShareVersions: [{ amount: 0, effectiveFrom: "2025-01" }],
      endMonth: "2025-03",
      loanEvents: [
        {
          durationMonths: 3,
          id: "loan-a",
          label: "Loan A",
          loanAmount: 30000,
          loanPeriodSavingsContribution: 5000,
          monthlyLoanServiceAmount: 10000,
          openingOutstandingPrincipalBalance: 30000,
          startMonth: "2025-01",
          topUp: 5000,
        },
      ],
      memberJoinedMonth: "2025-01",
      rowAdjustments: [
        {
          loanRepaymentAmount: 15000,
          loanRepaymentOnTime: true,
          month: "2025-02",
          notes: "Large one-time repayment",
          savingsContribution: 7000,
        },
      ],
      startMonth: "2025-01",
    })

    const rows = projectBackfillDraftToMemberLedgerRows(draft)
    const segments = groupRowsByEffectiveDateSegment(rows)

    expect(rows[1]).toMatchObject({
      isEdited: true,
      loanColumns: [
        {
          label: "Loan A",
          outstandingPrincipalBalance: 5000,
          repaymentAmount: 15000,
          repaymentOnTime: true,
        },
      ],
      savingsContribution: 7000,
    })
    expect(rows[2]?.loanColumns[0]?.outstandingPrincipalBalance).toBe(0)
    expect(segments).toHaveLength(3)
    expect(segments.map((segment) => segment.summary.rowCount)).toEqual([
      1, 1, 1,
    ])
  })
})
