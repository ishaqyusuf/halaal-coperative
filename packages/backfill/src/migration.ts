import type {
  BackfillDraft,
  BackfillRow,
  EffectiveDateSegment,
  MemberLedgerBackfillLoanTakenEvent,
  MemberLedgerBackfillRow,
  MonthlyLedgerSegment,
} from "./types"

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateOutstandingLoanPrincipalBalance(input: {
  principalAmount: number
  principalRepayments: number
}) {
  return roundCurrency(
    Math.max(0, input.principalAmount - input.principalRepayments)
  )
}

export function calculateNetSavingsContribution(input: {
  chargeDeductions: number
  grossContribution: number
  shareCapitalContribution: number
}) {
  return roundCurrency(
    Math.max(
      0,
      input.grossContribution -
        input.chargeDeductions -
        input.shareCapitalContribution
    )
  )
}

export function groupRowsByEffectiveDateSegment(
  rows: MemberLedgerBackfillRow[]
): EffectiveDateSegment[] {
  const segments: EffectiveDateSegment[] = []
  let currentMonthlySegment: MonthlyLedgerSegment | null = null
  let monthlySegmentIndex = 0

  function buildAmountSummary(values: number[]) {
    if (values.length === 0) {
      return {
        maxAmount: 0,
        minAmount: 0,
      }
    }

    return {
      maxAmount: roundCurrency(Math.max(...values)),
      minAmount: roundCurrency(Math.min(...values)),
    }
  }

  function buildMonthlySummary(rows: MemberLedgerBackfillRow[]) {
    const chargeLabels = Array.from(
      new Set(rows.flatMap((row) => Object.keys(row.chargeDeductions)))
    )

    return {
      chargeSummaries: chargeLabels.map((label) => ({
        label,
        ...buildAmountSummary(
          rows.map((row) => row.chargeDeductions[label] ?? 0)
        ),
      })),
      hasLegacyLoan: rows.some((row) => row.loanColumns.length > 0),
      hasManualRepaymentAdjustment: rows.some(
        (row) => row.hasManualRepaymentAdjustment
      ),
      hasManualSavingsAdjustment: rows.some(
        (row) => row.hasManualSavingsAdjustment
      ),
      rowCount: rows.length,
      shareCapitalSummary: buildAmountSummary(
        rows.map((row) => row.shareCapitalContribution)
      ),
    }
  }

  function getMonthlyReasonList(segment: MonthlyLedgerSegment) {
    const reasons = new Set<string>()

    for (const row of segment.rows) {
      if (row.loanColumns.length > 0) {
        reasons.add("Loan repayment")
      }

      if (row.savingsContribution > 0) {
        reasons.add("Commitment")
      }

      for (const [chargeLabel, amount] of Object.entries(
        row.chargeDeductions
      )) {
        if (amount > 0) {
          reasons.add(chargeLabel)
        }
      }

      if (row.isEdited && row.status !== "missed" && row.status !== "paused") {
        reasons.add("One-time override")
      }

      if (row.status === "missed") {
        reasons.add("Defaulting")
      }

      if (row.status === "paused") {
        reasons.add(row.statusReason ?? "Inactive")
      }
    }

    return reasons.size > 0 ? Array.from(reasons) : ["Monthly commitment"]
  }

  function createMonthlySegment(
    row: MemberLedgerBackfillRow
  ): MonthlyLedgerSegment {
    monthlySegmentIndex += 1
    return {
      kind: "monthly",
      key: `monthly-${monthlySegmentIndex}`,
      label: "",
      reasonList: [],
      rows: [row],
      summary: buildMonthlySummary([row]),
    }
  }

  function finalizeMonthlySegment() {
    if (!currentMonthlySegment) {
      return
    }

    const first = currentMonthlySegment.rows[0]
    const last =
      currentMonthlySegment.rows[currentMonthlySegment.rows.length - 1]
    currentMonthlySegment.label =
      first && last
        ? `Segment ${monthlySegmentIndex}: ${first.period} - ${last.period}`
        : `Segment ${monthlySegmentIndex}`
    currentMonthlySegment.reasonList = getMonthlyReasonList(
      currentMonthlySegment
    )
    segments.push(currentMonthlySegment)
    currentMonthlySegment = null
  }

  function appendMonthlyRow(row: MemberLedgerBackfillRow) {
    if (
      !currentMonthlySegment ||
      currentMonthlySegment.rows[0]?.effectiveDateSegmentKey !==
        row.effectiveDateSegmentKey
    ) {
      finalizeMonthlySegment()
      currentMonthlySegment = createMonthlySegment(row)
      return
    }

    currentMonthlySegment.rows.push(row)
    currentMonthlySegment.summary = buildMonthlySummary(
      currentMonthlySegment.rows
    )
  }

  for (const row of rows) {
    const hasProfitEvent = row.dividendCredit > 0
    const hasLoanTakenEvent = Boolean(row.loanTakenEvent)

    if (hasProfitEvent) {
      finalizeMonthlySegment()
      segments.push({
        kind: "profit",
        key: `profit-${row.month ?? row.period}-${row.dividendProfitEntryId ?? row.period}`,
        label: `Dividend segment: ${row.period}`,
        reasonList: ["Business profit"],
        row,
      })
    }

    appendMonthlyRow(row)

    if (hasProfitEvent || hasLoanTakenEvent) {
      finalizeMonthlySegment()
    }

    if (row.loanTakenEvent) {
      segments.push({
        kind: "loan_taken",
        key: `loan-taken-${row.month ?? row.period}-${row.loanTakenEvent.id}`,
        label: `Loan segment: ${row.period}`,
        reasonList: ["Loan"],
        loan: row.loanTakenEvent,
        row,
      })
    }
  }

  finalizeMonthlySegment()

  return segments
}

function getPeriodLabel(row: BackfillRow) {
  return row.monthLabel || row.month
}

function getProjectedRowSignature(row: BackfillRow) {
  const usePlannedValuesForGrouping =
    row.status === "missed" ||
    row.hasManualRepaymentAdjustment ||
    row.hasManualSavingsAdjustment
  const plannedLoanService = usePlannedValuesForGrouping
    ? (row.plannedLoanRepaymentAmount ?? row.loanService)
    : row.loanService
  const plannedSavingsContribution = usePlannedValuesForGrouping
    ? (row.plannedSavingsContribution ??
      Math.max(0, row.amount - row.loanService))
    : Math.max(0, row.amount - row.loanService)
  const groupingStatus =
    row.status === "adjusted" || row.status === "missed" ? "active" : row.status
  const groupingStatusReason =
    row.status === "adjusted" || row.status === "missed"
      ? null
      : (row.statusReason ?? null)

  return JSON.stringify({
    charges:
      row.status === "missed"
        ? (row.plannedChargeValues ?? row.chargeValues)
        : row.chargeValues,
    loanLabel: row.loanEvent?.label ?? null,
    loanService: plannedLoanService,
    savingsContribution: plannedSavingsContribution,
    share:
      row.status === "missed" ? (row.plannedShare ?? row.share) : row.share,
    status: groupingStatus,
    statusReason: groupingStatusReason,
  })
}

export function projectBackfillDraftToMemberLedgerRows(
  draft: BackfillDraft
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
      ])
    )
    const savingsContribution = roundCurrency(
      Math.max(0, row.amount - row.loanService)
    )
    const loanTakenEvent: MemberLedgerBackfillLoanTakenEvent | undefined =
      row.loanEvent && row.loanEvent.startMonth === row.month
        ? {
            amount: row.loanEvent.loanAmount,
            commitmentAmount:
              row.loanEvent.loanPeriodSavingsContribution ??
              row.loanEvent.topUp,
            id: row.loanEvent.id ?? `${row.month}-loan`,
            label: row.loanEvent.label ?? "Legacy loan",
            openingPendingAmount:
              row.loanEvent.openingOutstandingPrincipalBalance ??
              row.loanEvent.loanAmount,
            repaymentAmount: row.loanEvent.monthlyLoanServiceAmount,
            termMonths: row.loanEvent.durationMonths,
          }
        : undefined

    runningSavingsBalance = roundCurrency(
      runningSavingsBalance + row.netDeposit
    )
    runningShareCapitalBalance = roundCurrency(
      runningShareCapitalBalance + row.share
    )

    return {
      chargeDeductions,
      dividendCredit: row.dividend,
      dividendLabel: row.dividendLabel,
      dividendProfitEntryId: row.dividendProfitEntryId,
      dividendSharePercentage: row.dividendSharePercentage,
      effectiveDateSegmentKey: segmentLabels.get(segmentKey) ?? segmentKey,
      grossContribution: savingsContribution,
      hasManualRepaymentAdjustment:
        row.hasManualRepaymentAdjustment || undefined,
      hasManualSavingsAdjustment: row.hasManualSavingsAdjustment || undefined,
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
      loanTakenEvent,
      month: row.month,
      netSavingsContribution: row.netDeposit,
      period: getPeriodLabel(row),
      runningSavingsBalance,
      runningShareCapitalBalance,
      savingsContribution,
      shareCapitalContribution: row.share,
      status: row.status,
      statusReason: row.statusReason,
    }
  })
}
