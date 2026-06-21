import type {
  BackfillDraft,
  BackfillRow,
  EffectiveDateSegment,
  MemberLedgerBackfillRow,
} from "./types"

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateOutstandingLoanPrincipalBalance(input: {
  principalAmount: number
  principalRepayments: number
}) {
  return roundCurrency(Math.max(0, input.principalAmount - input.principalRepayments))
}

export function calculateNetSavingsContribution(input: {
  chargeDeductions: number
  grossContribution: number
  shareCapitalContribution: number
}) {
  return roundCurrency(
    Math.max(0, input.grossContribution - input.chargeDeductions - input.shareCapitalContribution),
  )
}

export function groupRowsByEffectiveDateSegment(
  rows: MemberLedgerBackfillRow[],
): EffectiveDateSegment[] {
  const segments = new Map<string, EffectiveDateSegment>()

  for (const row of rows) {
    const existing = segments.get(row.effectiveDateSegmentKey)
    const chargeLabels = Object.keys(row.chargeDeductions)
    const hasLegacyLoan = row.loanColumns.length > 0

    if (!existing) {
      segments.set(row.effectiveDateSegmentKey, {
        key: row.effectiveDateSegmentKey,
        label: row.effectiveDateSegmentKey,
        rows: [row],
        summary: {
          chargeLabels,
          hasLegacyLoan,
          rowCount: 1,
        },
      })
      continue
    }

    existing.rows.push(row)
    existing.summary = {
      chargeLabels: Array.from(new Set([...existing.summary.chargeLabels, ...chargeLabels])),
      hasLegacyLoan: existing.summary.hasLegacyLoan || hasLegacyLoan,
      rowCount: existing.rows.length,
    }
  }

  return Array.from(segments.values())
}

function getPeriodLabel(row: BackfillRow) {
  return row.monthLabel || row.month
}

function getProjectedRowSignature(row: BackfillRow) {
  return JSON.stringify({
    charges: row.chargeValues,
    isEdited: row.isEdited,
    loanLabel: row.loanEvent?.label ?? null,
    loanRepaymentOnTime: row.loanRepaymentOnTime ?? null,
    loanService: row.loanService,
    savingsContribution: Math.max(0, row.amount - row.loanService),
    share: row.share,
  })
}

export function projectBackfillDraftToMemberLedgerRows(
  draft: BackfillDraft,
): MemberLedgerBackfillRow[] {
  const runningRows = draft.rows.map((row) => ({
    row,
    segmentKey: "",
    signature: getProjectedRowSignature(row),
  }))
  const segmentLabels = new Map<string, string>()
  let segmentIndex = 0
  let previousSignature: string | null = null
  let currentSegmentRows: typeof runningRows = []

  function flushSegment() {
    if (currentSegmentRows.length === 0) {
      return
    }

    const first = currentSegmentRows[0]
    const last = currentSegmentRows[currentSegmentRows.length - 1]
    if (!first || !last) {
      return
    }

    const label = `Segment ${segmentIndex}: ${getPeriodLabel(first.row)} - ${getPeriodLabel(last.row)}`
    segmentLabels.set(first.segmentKey, label)
    currentSegmentRows = []
  }

  for (const item of runningRows) {
    if (item.signature !== previousSignature) {
      flushSegment()
      segmentIndex += 1
      previousSignature = item.signature
    }

    item.segmentKey = `segment-${segmentIndex}`
    currentSegmentRows.push(item)
  }

  flushSegment()

  let runningSavingsBalance = 0
  let runningShareCapitalBalance = 0

  return runningRows.map(({ row, segmentKey }) => {
    const chargeDeductions = Object.fromEntries(
      draft.chargeColumns.map((column) => [
        column.label,
        row.chargeValues[column.code] ?? 0,
      ]),
    )
    const savingsContribution = roundCurrency(Math.max(0, row.amount - row.loanService))

    runningSavingsBalance = roundCurrency(runningSavingsBalance + row.netDeposit)
    runningShareCapitalBalance = roundCurrency(runningShareCapitalBalance + row.share)

    return {
      chargeDeductions,
      dividendCredit: row.dividend,
      dividendLabel: row.dividendLabel,
      dividendProfitEntryId: row.dividendProfitEntryId,
      effectiveDateSegmentKey: segmentLabels.get(segmentKey) ?? segmentKey,
      grossContribution: savingsContribution,
      isEdited: row.isEdited || undefined,
      loanColumns:
        row.loanService > 0
          ? [
              {
                id: row.loanEvent?.id ?? `${row.month}-loan`,
                label: row.loanEvent?.label ?? "Legacy loan",
                outstandingPrincipalBalance: row.pendingLoanPayment,
                repaymentOnTime: row.loanRepaymentOnTime,
                repaymentAmount: row.loanService,
              },
            ]
          : [],
      month: row.month,
      netSavingsContribution: row.netDeposit,
      period: getPeriodLabel(row),
      runningSavingsBalance,
      runningShareCapitalBalance,
      savingsContribution,
      shareCapitalContribution: row.share,
    }
  })
}
