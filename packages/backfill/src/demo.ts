import { buildBackfillDraft } from "./generator"
import type { BuildBackfillDraftInput } from "./types"

export function createDemoBackfillInput(input?: {
  cooperativeStartMonth?: string
  memberJoinedMonth?: string
}): BuildBackfillDraftInput {
  return {
    amountLogs: [
      { effectiveFrom: "2024-01", amount: 20000, notes: "Initial amount" },
      { effectiveFrom: "2024-08", amount: 25000, notes: "Salary increase" },
    ],
    chargeDefinitions: [
      {
        code: "levy",
        label: "Levy",
        versions: [{ effectiveFrom: "2024-01", amount: 1000 }],
      },
      {
        code: "admin_fee",
        label: "Admin Fee",
        versions: [
          { effectiveFrom: "2024-01", amount: 1500 },
          { effectiveFrom: "2025-03", amount: 2000 },
        ],
      },
    ],
    defaultShareVersions: [
      { effectiveFrom: "2024-01", amount: 10000 },
      { effectiveFrom: "2025-01", amount: 15000 },
    ],
    dividendEntries: [
      { amount: 8500, label: "Q1 dividend", month: "2025-03" },
    ],
    endMonth: "2026-04",
    existingHistoryImpacts: [
      {
        kind: "contribution" as const,
        message: "Existing contribution history for Apr 2024 will be replaced if this draft is applied.",
        month: "2024-04",
        severity: "medium" as const,
      },
      {
        kind: "repayment" as const,
        message: "Existing repayment history from Mar 2025 onward will be recalculated by the loan propagation flow.",
        month: "2025-03",
        severity: "high" as const,
      },
      {
        kind: "dividend" as const,
        message: "Dividend for Mar 2025 is read-only and included in totals.",
        month: "2025-03",
        severity: "low" as const,
      },
    ],
    loanEvents: [
      {
        durationMonths: 12,
        loanAmount: 120000,
        monthlyLoanServiceAmount: 10000,
        startMonth: "2025-03",
        topUp: 5000,
      },
    ],
    memberJoinedMonth: input?.memberJoinedMonth ?? "2024-01",
    profitPeriods: [
      {
        month: "2025-03",
        totalProfitAmount: 100000,
        distributableAmount: 8500,
        notes: "Quarterly business profit",
      },
    ],
    shareOverrideVersions: [
      { effectiveFrom: "2025-03", amount: 18000, notes: "Custom member share" },
    ],
    startMonth: input?.cooperativeStartMonth ?? "2024-01",
  }
}

export function createDemoBackfillDraft(input?: {
  cooperativeStartMonth?: string
  memberJoinedMonth?: string
}) {
  return buildBackfillDraft(createDemoBackfillInput(input))
}
