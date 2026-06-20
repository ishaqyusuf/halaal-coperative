import type {
  BackfillChargeDefinition,
  BackfillDraft,
  BackfillExistingHistoryImpact,
  BackfillLoanEvent,
  BackfillMonthStatus,
  BackfillProfitPeriod,
  BackfillRow,
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
  return value.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).toUpperCase()
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
  const monthDate = parseMonthKey(month)
  const sorted = [...versions].sort((left, right) =>
    parseMonthKey(left.effectiveFrom).getTime() - parseMonthKey(right.effectiveFrom).getTime(),
  )

  let resolved = 0
  for (const version of sorted) {
    if (parseMonthKey(version.effectiveFrom) <= monthDate) {
      resolved = version.amount
    }
  }

  return resolved
}

function resolveChargeValues(month: string, chargeDefinitions: BackfillChargeDefinition[]) {
  const monthDate = parseMonthKey(month)

  return Object.fromEntries(
    chargeDefinitions.map((definition) => {
      const sorted = [...definition.versions].sort((left, right) =>
        parseMonthKey(left.effectiveFrom).getTime() - parseMonthKey(right.effectiveFrom).getTime(),
      )
      let resolved = 0
      for (const version of sorted) {
        if (parseMonthKey(version.effectiveFrom) <= monthDate) {
          resolved = version.amount
        }
      }

      return [definition.code, resolved]
    }),
  )
}

function resolveAmount(month: string, versions: BackfillShareVersion[]) {
  return resolveVersionAmount(month, versions)
}

function resolveDividend(month: string, dividends: Array<{ amount: number; label: string; month: string }>) {
  return dividends.find((entry) => entry.month === month) ?? null
}

function resolveHistoryImpacts(
  month: string,
  impacts: BackfillExistingHistoryImpact[],
) {
  return impacts.filter((impact) => impact.month === month)
}

function applyLoanPropagation(rows: BackfillRow[], loanEvents: BackfillLoanEvent[]) {
  const sortedEvents = [...loanEvents].sort((left, right) =>
    parseMonthKey(left.startMonth).getTime() - parseMonthKey(right.startMonth).getTime(),
  )

  for (const event of sortedEvents) {
    const startIndex = rows.findIndex((row) => row.month === event.startMonth)
    if (startIndex === -1) continue

    let remainingPrincipal = event.loanAmount

    for (let index = startIndex; index < rows.length; index += 1) {
      const row = rows[index]
      if (!row || index >= startIndex + event.durationMonths) {
        break
      }

      row.loanEvent = index === startIndex ? event : row.loanEvent
      row.loanService = event.monthlyLoanServiceAmount
      row.status = event.status ?? row.status

      if (!row.isEdited) {
        row.amount = event.monthlyLoanServiceAmount + event.topUp
      }

      const scheduledPayment = event.monthlyLoanServiceAmount
      const paidTowardLoan = Math.min(row.amount, scheduledPayment)
      remainingPrincipal = Math.max(0, remainingPrincipal - paidTowardLoan)
      row.pendingLoanPayment = Math.max(0, scheduledPayment - paidTowardLoan) + remainingPrincipal
      row.netDeposit = calculateNetDeposit(row)
    }
  }

  return rows
}

function calculateNetDeposit(row: BackfillRow) {
  const chargesTotal = Object.values(row.chargeValues).reduce((sum, value) => sum + value, 0)
  return row.amount - row.loanService - row.share - chargesTotal + row.dividend
}

export function deriveBackfillWarnings(rows: BackfillRow[]) {
  const warnings: BackfillWarning[] = rows.flatMap((row) =>
    row.existingHistoryImpacts.map((impact) => ({
      code: `${impact.kind}:${row.month}`,
      message: impact.message,
      month: row.month,
      severity: impact.severity,
    })),
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
      (sum, row) => sum + Object.values(row.chargeValues).reduce((rowSum, value) => rowSum + value, 0),
      0,
    ),
    totalDividend: rows.reduce((sum, row) => sum + row.dividend, 0),
    totalLoanService: rows.reduce((sum, row) => sum + row.loanService, 0),
    totalNetDeposit: rows.reduce((sum, row) => sum + row.netDeposit, 0),
    totalPendingLoanPayment: rows.reduce((sum, row) => sum + row.pendingLoanPayment, 0),
    totalShare: rows.reduce((sum, row) => sum + row.share, 0),
  }
}

export function buildBackfillDraft(input: BuildBackfillDraftInput): BackfillDraft {
  const effectiveStart =
    parseMonthKey(input.memberJoinedMonth) > parseMonthKey(input.startMonth)
      ? input.memberJoinedMonth
      : input.startMonth
  const months = listMonthsBetween(effectiveStart, input.endMonth)
  const baseRows: BackfillRow[] = months.map((monthDate) => {
    const month = formatMonthKey(monthDate)
    const chargeValues = resolveChargeValues(month, input.chargeDefinitions)
    const share = resolveVersionAmount(month, input.shareOverrideVersions ?? [])
      || resolveVersionAmount(month, input.defaultShareVersions)
    const amount = resolveAmount(month, input.amountLogs)
    const dividend = resolveDividend(month, input.dividendEntries ?? [])
    const historyImpacts = resolveHistoryImpacts(month, input.existingHistoryImpacts ?? [])
    const row: BackfillRow = {
      amount,
      chargeValues,
      dividend: dividend?.amount ?? 0,
      dividendLabel: dividend?.label,
      existingHistoryImpacts: historyImpacts,
      isEdited: false,
      loanService: 0,
      month,
      monthLabel: formatMonthLabel(monthDate),
      netDeposit: 0,
      pendingLoanPayment: 0,
      share,
      status: "active",
    }

    row.netDeposit = calculateNetDeposit(row)
    return row
  })

  const rows = applyLoanPropagation(baseRows, input.loanEvents ?? [])
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
  event: BackfillLoanEvent,
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
  status: BackfillMonthStatus,
) {
  return rows.map((row) =>
    row.month === month
      ? {
          ...row,
          isEdited: true,
          netDeposit:
            status === "missed"
              ? 0
              : calculateNetDeposit({ ...row, status }),
          status,
        }
      : row,
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
    },
  )
}
