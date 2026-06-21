import type {
  BackfillChargeDefinition,
  BackfillDraft,
  BackfillExistingHistoryImpact,
  BackfillLoanEvent,
  BackfillMonthStatus,
  BackfillProfitPeriod,
  BackfillRow,
  BackfillRowAdjustment,
  BackfillShareVersion,
  BackfillWarning,
  BuildBackfillDraftInput,
} from "./types"

function parseMonthKey(value: string) {
  const [yearText, monthText] = value.split("-")
  const year = Number(yearText)
  const month = Number(monthText ?? "01")
  return new Date(Date.UTC(year, month - 1, 1))
}

function formatMonthKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`
}

function formatMonthLabel(value: Date) {
  return value
    .toLocaleString("en-US", {
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    })
    .toUpperCase()
}

function listMonthsBetween(startMonth: string, endMonth: string) {
  const start = parseMonthKey(startMonth)
  const end = parseMonthKey(endMonth)
  const months: Date[] = []
  const cursor = new Date(start)

  while (cursor <= end) {
    months.push(new Date(cursor))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }

  return months
}

function resolveVersionAmount(month: string, versions: BackfillShareVersion[]) {
  return resolveVersion(month, versions)?.amount ?? 0
}

function resolveVersion(month: string, versions: BackfillShareVersion[]) {
  const monthDate = parseMonthKey(month)
  const sorted = [...versions].sort(
    (left, right) =>
      parseMonthKey(left.effectiveFrom).getTime() -
      parseMonthKey(right.effectiveFrom).getTime()
  )

  let resolved: BackfillShareVersion | null = null
  for (const version of sorted) {
    if (parseMonthKey(version.effectiveFrom) <= monthDate) {
      resolved = version
    }
  }

  return resolved
}

function resolveChargeVersion(
  month: string,
  definition: BackfillChargeDefinition
) {
  const monthDate = parseMonthKey(month)
  const sorted = [...definition.versions].sort(
    (left, right) =>
      parseMonthKey(left.effectiveFrom).getTime() -
      parseMonthKey(right.effectiveFrom).getTime()
  )

  let resolved: BackfillChargeDefinition["versions"][number] | null = null
  for (const version of sorted) {
    const versionMonth = parseMonthKey(version.effectiveFrom)
    if ((definition.frequency ?? "recurring_monthly") === "one_time") {
      if (formatMonthKey(versionMonth) === month) {
        resolved = version
      }
      continue
    }

    if (versionMonth <= monthDate) {
      resolved = version
    }
  }

  return resolved
}

function resolveAmount(month: string, versions: BackfillShareVersion[]) {
  return resolveVersionAmount(month, versions)
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function resolveShareVersion(month: string, input: BuildBackfillDraftInput) {
  return (
    resolveVersion(month, input.shareOverrideVersions ?? []) ??
    resolveVersion(month, input.defaultShareVersions)
  )
}

function calculateShareAmount(
  row: BackfillRow,
  version: BackfillShareVersion | null
) {
  if (!version) {
    return 0
  }

  if ((version.valueType ?? "fixed_amount") === "fixed_amount") {
    return version.amount
  }

  const chargesTotal = Object.values(row.chargeValues).reduce(
    (sum, value) => sum + value,
    0
  )
  const savingsBeforeShare = Math.max(
    0,
    row.amount - row.loanService - chargesTotal
  )
  return roundCurrency(savingsBeforeShare * (version.amount / 100))
}

function calculateChargeAmount(
  row: BackfillRow,
  version: BackfillChargeDefinition["versions"][number] | null
) {
  if (!version) {
    return 0
  }

  if ((version.valueType ?? "fixed_amount") === "fixed_amount") {
    return version.amount
  }

  const savingsContribution = Math.max(0, row.amount - row.loanService)
  return roundCurrency(savingsContribution * (version.amount / 100))
}

function applyChargeResolution(
  rows: BackfillRow[],
  input: BuildBackfillDraftInput
) {
  return rows.map((row) => {
    row.chargeValues = Object.fromEntries(
      input.chargeDefinitions.map((definition) => {
        if ((definition.frequency ?? "recurring_monthly") === "manual") {
          return [definition.code, 0]
        }

        return [
          definition.code,
          calculateChargeAmount(
            row,
            resolveChargeVersion(row.month, definition)
          ),
        ]
      })
    )
    row.netDeposit = calculateNetDeposit(row)
    return row
  })
}

function resolveDividend(
  month: string,
  dividends: Array<{ amount: number; label: string; month: string }>
) {
  return dividends.find((entry) => entry.month === month) ?? null
}

function resolveHistoryImpacts(
  month: string,
  impacts: BackfillExistingHistoryImpact[]
) {
  return impacts.filter((impact) => impact.month === month)
}

function applyLoanPropagation(
  rows: BackfillRow[],
  loanEvents: BackfillLoanEvent[]
) {
  const sortedEvents = [...loanEvents].sort(
    (left, right) =>
      parseMonthKey(left.startMonth).getTime() -
      parseMonthKey(right.startMonth).getTime()
  )

  for (const event of sortedEvents) {
    const startIndex = rows.findIndex((row) => row.month === event.startMonth)
    if (startIndex === -1) continue

    let remainingPrincipal =
      event.openingOutstandingPrincipalBalance ?? event.loanAmount

    for (let index = startIndex; index < rows.length; index += 1) {
      const row = rows[index]
      if (!row || index >= startIndex + event.durationMonths) {
        break
      }

      row.loanEvent = event
      row.loanService = event.monthlyLoanServiceAmount
      row.status = event.status ?? row.status

      if (!row.isEdited) {
        row.amount =
          event.monthlyLoanServiceAmount +
          (event.loanPeriodSavingsContribution ?? event.topUp)
      }

      const scheduledPayment = row.loanService
      const paidTowardLoan = Math.min(row.amount, scheduledPayment)
      remainingPrincipal = Math.max(0, remainingPrincipal - paidTowardLoan)
      row.pendingLoanPayment =
        Math.max(0, scheduledPayment - paidTowardLoan) + remainingPrincipal
      row.netDeposit = calculateNetDeposit(row)
    }
  }

  return rows
}

function applyRowAdjustments(
  rows: BackfillRow[],
  adjustments: BackfillRowAdjustment[]
) {
  const adjustmentByMonth = new Map(
    adjustments.map((adjustment) => [adjustment.month, adjustment])
  )

  return rows.map((row) => {
    const adjustment = adjustmentByMonth.get(row.month)
    if (!adjustment) {
      return row
    }

    const savingsContribution =
      adjustment.savingsContribution ??
      Math.max(0, row.amount - row.loanService)
    const loanRepaymentAmount =
      adjustment.loanRepaymentAmount ?? row.loanService

    row.loanService = loanRepaymentAmount
    row.loanRepaymentOnTime = adjustment.loanRepaymentOnTime
    row.amount = savingsContribution + loanRepaymentAmount
    row.isEdited = true
    row.notes = adjustment.notes
    row.netDeposit = calculateNetDeposit(row)
    return row
  })
}

function applyShareResolution(
  rows: BackfillRow[],
  input: BuildBackfillDraftInput
) {
  return rows.map((row) => {
    row.share = calculateShareAmount(row, resolveShareVersion(row.month, input))
    row.netDeposit = calculateNetDeposit(row)
    return row
  })
}

function recalculateLoanBalances(rows: BackfillRow[]) {
  const remainingPrincipalByLoan = new Map<string, number>()

  for (const row of rows) {
    if (!row.loanEvent || row.loanService <= 0) {
      continue
    }

    const loanKey =
      row.loanEvent.id ??
      `${row.loanEvent.label ?? "legacy-loan"}-${row.loanEvent.startMonth}`
    const startingPrincipal =
      remainingPrincipalByLoan.get(loanKey) ??
      row.loanEvent.openingOutstandingPrincipalBalance ??
      row.loanEvent.loanAmount
    const paidTowardLoan = Math.min(row.loanService, startingPrincipal)
    const remainingPrincipal = Math.max(0, startingPrincipal - paidTowardLoan)

    row.pendingLoanPayment = remainingPrincipal
    row.netDeposit = calculateNetDeposit(row)
    remainingPrincipalByLoan.set(loanKey, remainingPrincipal)
  }

  return rows
}

function calculateNetDeposit(row: BackfillRow) {
  const chargesTotal = Object.values(row.chargeValues).reduce(
    (sum, value) => sum + value,
    0
  )
  return row.amount - row.loanService - row.share - chargesTotal + row.dividend
}

export function deriveBackfillWarnings(rows: BackfillRow[]) {
  const warnings: BackfillWarning[] = rows.flatMap((row) =>
    row.existingHistoryImpacts.map((impact) => ({
      code: `${impact.kind}:${row.month}`,
      message: impact.message,
      month: row.month,
      severity: impact.severity,
    }))
  )

  const missedRows = rows.filter((row) => row.status === "missed")
  if (missedRows.length) {
    warnings.push({
      code: "missed-months",
      message: `${missedRows.length} month(s) are marked missed and will reduce the generated contribution history.`,
      month: undefined,
      severity: "medium",
    })
  }

  return warnings
}

export function deriveBackfillSummary(rows: BackfillRow[]) {
  return {
    editedRows: rows.filter((row) => row.isEdited).length,
    monthsGenerated: rows.length,
    totalCharges: rows.reduce(
      (sum, row) =>
        sum +
        Object.values(row.chargeValues).reduce(
          (rowSum, value) => rowSum + value,
          0
        ),
      0
    ),
    totalDividend: rows.reduce((sum, row) => sum + row.dividend, 0),
    totalLoanService: rows.reduce((sum, row) => sum + row.loanService, 0),
    totalNetDeposit: rows.reduce((sum, row) => sum + row.netDeposit, 0),
    totalPendingLoanPayment: rows.reduce(
      (sum, row) => sum + row.pendingLoanPayment,
      0
    ),
    totalShare: rows.reduce((sum, row) => sum + row.share, 0),
  }
}

export function buildBackfillDraft(
  input: BuildBackfillDraftInput
): BackfillDraft {
  const effectiveStart =
    parseMonthKey(input.memberJoinedMonth) > parseMonthKey(input.startMonth)
      ? input.memberJoinedMonth
      : input.startMonth
  const months = listMonthsBetween(effectiveStart, input.endMonth)
  const baseRows: BackfillRow[] = months.map((monthDate) => {
    const month = formatMonthKey(monthDate)
    const amount = resolveAmount(month, input.amountLogs)
    const dividend = resolveDividend(month, input.dividendEntries ?? [])
    const historyImpacts = resolveHistoryImpacts(
      month,
      input.existingHistoryImpacts ?? []
    )
    const row: BackfillRow = {
      amount,
      chargeValues: {},
      dividend: dividend?.amount ?? 0,
      dividendLabel: dividend?.label,
      dividendProfitEntryId: dividend?.profitEntryId,
      dividendSharePercentage: dividend?.sharePercentage,
      existingHistoryImpacts: historyImpacts,
      isEdited: false,
      loanService: 0,
      month,
      monthLabel: formatMonthLabel(monthDate),
      netDeposit: 0,
      pendingLoanPayment: 0,
      share: 0,
      status: "active",
    }

    row.netDeposit = calculateNetDeposit(row)
    return row
  })

  const rows = recalculateLoanBalances(
    applyShareResolution(
      applyChargeResolution(
        applyRowAdjustments(
          applyLoanPropagation(baseRows, input.loanEvents ?? []),
          input.rowAdjustments ?? []
        ),
        input
      ),
      input
    )
  )
  const warnings = deriveBackfillWarnings(rows)

  return {
    chargeColumns: input.chargeDefinitions.map((definition) => ({
      code: definition.code,
      label: definition.label,
    })),
    profitPeriods: input.profitPeriods ?? [],
    rows,
    summary: deriveBackfillSummary(rows),
    warnings,
  }
}

export function applyLoanEventToDraft(
  rows: BackfillRow[],
  event: BackfillLoanEvent
) {
  const clonedRows = rows.map((row) => ({
    ...row,
    chargeValues: { ...row.chargeValues },
    existingHistoryImpacts: [...row.existingHistoryImpacts],
  }))

  return applyLoanPropagation(clonedRows, [event])
}

export function markRowStatus(
  rows: BackfillRow[],
  month: string,
  status: BackfillMonthStatus
) {
  return rows.map((row) =>
    row.month === month
      ? {
          ...row,
          isEdited: true,
          netDeposit:
            status === "missed" ? 0 : calculateNetDeposit({ ...row, status }),
          status,
        }
      : row
  )
}

export function summarizeProfitPeriods(periods: BackfillProfitPeriod[]) {
  return periods.reduce(
    (summary, period) => {
      summary.totalProfit += period.totalProfitAmount
      summary.totalDistributable += period.distributableAmount
      return summary
    },
    {
      totalDistributable: 0,
      totalProfit: 0,
    }
  )
}
