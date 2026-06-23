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
      })
    ).toBe(65000)

    expect(
      calculateOutstandingLoanPrincipalBalance({
        principalAmount: 120000,
        principalRepayments: 150000,
      })
    ).toBe(0)
  })

  test("calculates net savings after charges and share capital", () => {
    expect(
      calculateNetSavingsContribution({
        chargeDeductions: 250,
        grossContribution: 5000,
        shareCapitalContribution: 150,
      })
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

    expect(groupRowsByEffectiveDateSegment(rows)).toMatchObject([
      {
        kind: "monthly",
        label: "Segment 1: Aug 2025 - Sep 2025",
        reasonList: ["Loan repayment", "Commitment", "Admin levy"],
        rows: [rows[0], rows[1]],
        summary: {
          chargeSummaries: [
            {
              label: "Admin levy",
              maxAmount: 100,
              minAmount: 100,
            },
          ],
          hasLegacyLoan: true,
          hasManualRepaymentAdjustment: false,
          hasManualSavingsAdjustment: false,
          rowCount: 2,
          shareCapitalSummary: {
            maxAmount: 100,
            minAmount: 100,
          },
        },
      },
      {
        kind: "monthly",
        label: "Segment 2: May 2026 - May 2026",
        reasonList: ["Commitment", "Admin levy"],
        rows: [rows[2]],
        summary: {
          chargeSummaries: [
            {
              label: "Admin levy",
              maxAmount: 100,
              minAmount: 100,
            },
          ],
          hasLegacyLoan: false,
          hasManualRepaymentAdjustment: false,
          hasManualSavingsAdjustment: false,
          rowCount: 1,
          shareCapitalSummary: {
            maxAmount: 100,
            minAmount: 100,
          },
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
    expect(segments.map((segment) => segment.kind)).toEqual([
      "monthly",
      "loan_taken",
      "monthly",
      "profit",
      "monthly",
    ])
  })

  test("keeps a business profit month in its own segment", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 15000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [],
      defaultShareVersions: [{ amount: 0, effectiveFrom: "2025-01" }],
      dividendEntries: [
        {
          amount: 1200,
          label: "Retail pool profit",
          month: "2025-02",
          profitEntryId: "profit-entry-1",
          sharePercentage: 10,
        },
      ],
      endMonth: "2025-03",
      memberJoinedMonth: "2025-01",
      startMonth: "2025-01",
    })

    const rows = projectBackfillDraftToMemberLedgerRows(draft)
    const segments = groupRowsByEffectiveDateSegment(rows)

    expect(rows.map((row) => row.dividendCredit)).toEqual([0, 1200, 0])
    expect(segments.map((segment) => segment.kind)).toEqual([
      "monthly",
      "profit",
      "monthly",
      "monthly",
    ])
    expect(
      segments.map((segment) =>
        segment.kind === "monthly"
          ? segment.rows.map((row) => row.month)
          : [segment.row.month]
      )
    ).toEqual([["2025-01"], ["2025-02"], ["2025-02"], ["2025-03"]])
    expect(segments[1]).toMatchObject({
      kind: "profit",
      reasonList: ["Business profit"],
    })
  })

  test("keeps a loan taken month after its monthly commitment segment", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 15000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [],
      defaultShareVersions: [{ amount: 0, effectiveFrom: "2025-01" }],
      endMonth: "2025-03",
      loanEvents: [
        {
          durationMonths: 2,
          id: "loan-a",
          label: "Loan A",
          loanAmount: 30000,
          loanPeriodSavingsContribution: 5000,
          monthlyLoanServiceAmount: 10000,
          openingOutstandingPrincipalBalance: 30000,
          startMonth: "2025-02",
          topUp: 5000,
        },
      ],
      memberJoinedMonth: "2025-01",
      startMonth: "2025-01",
    })

    const rows = projectBackfillDraftToMemberLedgerRows(draft)
    const segments = groupRowsByEffectiveDateSegment(rows)

    expect(segments.map((segment) => segment.kind)).toEqual([
      "monthly",
      "monthly",
      "loan_taken",
      "monthly",
    ])
    expect(segments[2]).toMatchObject({
      kind: "loan_taken",
      reasonList: ["Loan"],
      loan: {
        amount: 30000,
        commitmentAmount: 5000,
        repaymentAmount: 10000,
        termMonths: 2,
      },
      row: {
        month: "2025-02",
      },
    })
  })

  test("orders profit before monthly and loan taken after monthly for the same month", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 15000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [],
      defaultShareVersions: [{ amount: 0, effectiveFrom: "2025-01" }],
      dividendEntries: [
        {
          amount: 1200,
          label: "Retail pool profit",
          month: "2025-02",
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
          loanAmount: 30000,
          loanPeriodSavingsContribution: 5000,
          monthlyLoanServiceAmount: 10000,
          openingOutstandingPrincipalBalance: 30000,
          startMonth: "2025-02",
          topUp: 5000,
        },
      ],
      memberJoinedMonth: "2025-01",
      startMonth: "2025-01",
    })

    const rows = projectBackfillDraftToMemberLedgerRows(draft)
    const segments = groupRowsByEffectiveDateSegment(rows)

    expect(segments.map((segment) => segment.kind)).toEqual([
      "monthly",
      "profit",
      "monthly",
      "loan_taken",
      "monthly",
    ])
    expect(
      segments
        .slice(1, 4)
        .map((segment) =>
          segment.kind === "monthly"
            ? segment.rows.map((row) => row.month)
            : [segment.row.month]
        )
    ).toEqual([["2025-02"], ["2025-02"], ["2025-02"]])
  })

  test("keeps manual repayment and savings edits inside their planned segment", () => {
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
      hasManualRepaymentAdjustment: true,
      hasManualSavingsAdjustment: true,
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
    expect(segments.map((segment) => segment.kind)).toEqual([
      "monthly",
      "loan_taken",
      "monthly",
    ])
    expect(
      segments
        .filter((segment) => segment.kind === "monthly")
        .map((segment) => segment.summary.rowCount)
    ).toEqual([1, 2])
    expect(
      segments
        .filter((segment) => segment.kind === "monthly")
        .map((segment) => segment.summary.hasManualRepaymentAdjustment)
    ).toEqual([false, true])
    expect(
      segments
        .filter((segment) => segment.kind === "monthly")
        .map((segment) => segment.summary.hasManualSavingsAdjustment)
    ).toEqual([false, true])
  })

  test("keeps a manual savings-only edit inside the continuous commitment segment", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 15000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [],
      defaultShareVersions: [{ amount: 0, effectiveFrom: "2025-01" }],
      endMonth: "2025-03",
      memberJoinedMonth: "2025-01",
      rowAdjustments: [
        {
          month: "2025-02",
          notes: "Manual savings correction",
          savingsContribution: 7000,
        },
      ],
      startMonth: "2025-01",
    })

    const rows = projectBackfillDraftToMemberLedgerRows(draft)
    const segments = groupRowsByEffectiveDateSegment(rows)

    expect(rows[1]).toMatchObject({
      hasManualSavingsAdjustment: true,
      isEdited: true,
      savingsContribution: 7000,
    })
    expect(segments.map((segment) => segment.kind)).toEqual(["monthly"])
    expect(segments[0]).toMatchObject({
      kind: "monthly",
      summary: {
        hasManualRepaymentAdjustment: false,
        hasManualSavingsAdjustment: true,
        rowCount: 3,
      },
    })
  })

  test("marks a defaulting adjustment month as missed with zero commitment", () => {
    const draft = buildBackfillDraft({
      amountLogs: [{ amount: 15000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [
        {
          code: "stamp",
          label: "Stamp duty",
          versions: [{ amount: 50, effectiveFrom: "2025-01" }],
        },
      ],
      defaultShareVersions: [{ amount: 250, effectiveFrom: "2025-01" }],
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
      rowAdjustments: [{ month: "2025-02", status: "missed" }],
      startMonth: "2025-01",
    })

    const rows = projectBackfillDraftToMemberLedgerRows(draft)
    const segments = groupRowsByEffectiveDateSegment(rows)

    expect(rows[1]).toMatchObject({
      chargeDeductions: { "Stamp duty": 0 },
      loanColumns: [],
      netSavingsContribution: 0,
      savingsContribution: 0,
      shareCapitalContribution: 0,
      status: "missed",
      statusReason: "Defaulting",
    })
    expect(draft.rows[1]).toMatchObject({
      amount: 0,
      loanService: 0,
      pendingLoanPayment: 20000,
      plannedLoanRepaymentAmount: 10000,
      plannedSavingsContribution: 5000,
      status: "missed",
    })
    expect(segments.map((segment) => segment.kind)).toEqual([
      "monthly",
      "loan_taken",
      "monthly",
    ])
    expect(
      segments
        .filter((segment) => segment.kind === "monthly")
        .map((segment) => segment.summary.rowCount)
    ).toEqual([1, 2])
    expect(
      segments
        .filter((segment) => segment.kind === "monthly")
        .map((segment) => segment.reasonList)
    ).toContainEqual([
      "Defaulting",
      "Loan repayment",
      "Commitment",
      "Stamp duty",
    ])
  })

  test("pauses inactive months and resumes commitments from an active event", () => {
    const draft = buildBackfillDraft({
      activityEvents: [
        {
          effectiveFrom: "2025-02",
          reason: "Inactive",
          status: "inactive",
        },
        {
          effectiveFrom: "2025-04",
          reason: "Resumed",
          status: "active",
        },
      ],
      amountLogs: [{ amount: 15000, effectiveFrom: "2025-01" }],
      chargeDefinitions: [],
      defaultShareVersions: [{ amount: 250, effectiveFrom: "2025-01" }],
      endMonth: "2025-04",
      memberJoinedMonth: "2025-01",
      startMonth: "2025-01",
    })

    const rows = projectBackfillDraftToMemberLedgerRows(draft)

    expect(rows.map((row) => row.status)).toEqual([
      "active",
      "paused",
      "paused",
      "active",
    ])
    expect(rows.map((row) => row.savingsContribution)).toEqual([
      15000, 0, 0, 15000,
    ])
    expect(rows[1]).toMatchObject({
      netSavingsContribution: 0,
      runningSavingsBalance: rows[0]?.runningSavingsBalance,
      statusReason: "Inactive",
    })
    expect(rows[3]).toMatchObject({
      savingsContribution: 15000,
      shareCapitalContribution: 250,
    })
  })
})
