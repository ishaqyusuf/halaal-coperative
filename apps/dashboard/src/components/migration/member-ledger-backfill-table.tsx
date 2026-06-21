import type {
  EffectiveDateSegment,
  MemberLedgerBackfillLoanColumn,
  MemberLedgerBackfillRow,
} from "@halaalvest/backfill"
import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardDataTable,
  DashboardSurfaceCard,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  TrendPill,
} from "@/components/dashboard"

type MemberLedgerBackfillTableProps = {
  isRowAdjustmentDisabled: (row: MemberLedgerBackfillRow) => boolean
  renderProfitControl: (row: MemberLedgerBackfillRow) => React.ReactNode
  renderRepaymentControl: (
    row: MemberLedgerBackfillRow,
    loan: MemberLedgerBackfillLoanColumn,
    disabled: boolean
  ) => React.ReactNode
  renderSavingsControl: (
    row: MemberLedgerBackfillRow,
    loans: MemberLedgerBackfillLoanColumn[],
    disabled: boolean
  ) => React.ReactNode
  segments: EffectiveDateSegment[]
}

function formatAmountRange(values: number[]) {
  const uniqueValues = Array.from(
    new Set(values.map((value) => Number(value.toFixed(2))))
  )

  if (uniqueValues.length === 0) {
    return formatCurrency(0)
  }

  if (uniqueValues.length === 1) {
    return formatCurrency(uniqueValues[0])
  }

  return `${formatCurrency(Math.min(...uniqueValues))} - ${formatCurrency(
    Math.max(...uniqueValues)
  )}`
}

function formatHeaderAmount(label: string, values: number[]) {
  return `${label} (${formatAmountRange(values)})`
}

function getDividendHeaderLabel(segment: EffectiveDateSegment) {
  const labels = Array.from(
    new Set(
      segment.rows
        .filter((row) => row.dividendCredit > 0)
        .map((row) => row.dividendLabel)
        .filter((label): label is string => Boolean(label))
    )
  )

  if (labels.length === 1) {
    return `Dividend - ${labels[0]}`
  }

  if (labels.length > 1) {
    return `Dividend / profit (${labels.length} pools)`
  }

  return "Dividend / profit"
}

function getSegmentLoanColumns(segment: EffectiveDateSegment) {
  const loans: MemberLedgerBackfillLoanColumn[] = []
  const seen = new Set<string>()

  for (const row of segment.rows) {
    for (const loan of row.loanColumns) {
      if (seen.has(loan.id)) {
        continue
      }

      loans.push(loan)
      seen.add(loan.id)
    }
  }

  return loans
}

function getLoanColumnValues(
  segment: EffectiveDateSegment,
  loanId: string,
  field: "outstandingPrincipalBalance" | "repaymentAmount"
) {
  return segment.rows.flatMap((row) => {
    const loan = row.loanColumns.find((item) => item.id === loanId)

    return loan ? [loan[field]] : []
  })
}

function getLoanColumnLabel(
  loan: Pick<MemberLedgerBackfillLoanColumn, "label">,
  suffix: string
) {
  return `${loan.label} ${suffix}`
}

function getSegmentDriftDetails(segment: EffectiveDateSegment) {
  return {
    dividendRows: segment.rows.filter((row) => row.dividendCredit > 0).length,
    grossSavingsRange: formatAmountRange(
      segment.rows.map((row) => row.savingsContribution)
    ),
    overrideCount: segment.rows.filter((row) => row.isEdited).length,
    shareRange: formatAmountRange(
      segment.rows.map((row) => row.shareCapitalContribution)
    ),
    loanRepaymentRange: formatAmountRange(
      segment.rows.flatMap((row) =>
        row.loanColumns.map((loan) => loan.repaymentAmount)
      )
    ),
    totalShareRange: formatAmountRange(
      segment.rows.map((row) => row.runningShareCapitalBalance)
    ),
  }
}

export function MemberLedgerBackfillTable({
  isRowAdjustmentDisabled,
  renderProfitControl,
  renderRepaymentControl,
  renderSavingsControl,
  segments,
}: MemberLedgerBackfillTableProps) {
  if (segments.length === 0) {
    return (
      <DashboardSurfaceCard className="bg-background/70">
        <p className="text-sm font-semibold text-foreground">
          No generated ledger preview
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a member above to load historical ledger rows from the current
          migration setup.
        </p>
      </DashboardSurfaceCard>
    )
  }

  return (
    <div className="space-y-4">
      {segments.map((segment) => {
        const driftDetails = getSegmentDriftDetails(segment)
        const segmentLoanColumns = getSegmentLoanColumns(segment)

        return (
          <DashboardSurfaceCard key={segment.key} className="bg-background/70">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {segment.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {segment.summary.hasLegacyLoan
                    ? "Legacy loan active. Loan-period savings replaces normal savings."
                    : "Loan settled. Normal savings restored."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {segment.summary.chargeLabels.map((chargeLabel) => (
                    <TrendPill key={chargeLabel} tone="neutral">
                      {chargeLabel}
                    </TrendPill>
                  ))}
                  <TrendPill tone="neutral">
                    Savings {driftDetails.grossSavingsRange}
                  </TrendPill>
                  {segment.summary.hasLegacyLoan ? (
                    <TrendPill tone="neutral">
                      Repayment {driftDetails.loanRepaymentRange}
                    </TrendPill>
                  ) : null}
                  <TrendPill tone="neutral">
                    Share {driftDetails.shareRange}
                  </TrendPill>
                  <TrendPill tone="neutral">
                    Total share {driftDetails.totalShareRange}
                  </TrendPill>
                  {driftDetails.dividendRows > 0 ? (
                    <TrendPill tone="positive">
                      {driftDetails.dividendRows} dividend rows
                    </TrendPill>
                  ) : null}
                  {driftDetails.overrideCount > 0 ? (
                    <TrendPill tone="warning">
                      {driftDetails.overrideCount} overrides
                    </TrendPill>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <TrendPill
                  tone={segment.summary.hasLegacyLoan ? "warning" : "positive"}
                >
                  {segment.summary.hasLegacyLoan
                    ? "Loan active"
                    : "No loan columns"}
                </TrendPill>
                <TrendPill tone="neutral">
                  {segment.summary.rowCount} rows
                </TrendPill>
              </div>
            </div>

            <DashboardDataTable>
              <DashboardTable className="min-w-[1580px]">
                <DashboardTableHead>
                  <DashboardTableHeaderCell>Period</DashboardTableHeaderCell>
                  {segmentLoanColumns.map((loan) => (
                    <DashboardTableHeaderCell
                      align="right"
                      key={`${loan.id}-repayment-header`}
                    >
                      {formatHeaderAmount(
                        getLoanColumnLabel(loan, "repayment"),
                        getLoanColumnValues(
                          segment,
                          loan.id,
                          "repaymentAmount"
                        )
                      )}
                    </DashboardTableHeaderCell>
                  ))}
                  <DashboardTableHeaderCell align="right">
                    {formatHeaderAmount(
                      "Savings",
                      segment.rows.map((row) => row.savingsContribution)
                    )}
                  </DashboardTableHeaderCell>
                  {segment.summary.chargeLabels.map((chargeLabel) => (
                    <DashboardTableHeaderCell key={chargeLabel} align="right">
                      {formatHeaderAmount(
                        chargeLabel,
                        segment.rows.map(
                          (row) => row.chargeDeductions[chargeLabel] ?? 0
                        )
                      )}
                    </DashboardTableHeaderCell>
                  ))}
                  <DashboardTableHeaderCell align="right">
                    {formatHeaderAmount(
                      "Share capital",
                      segment.rows.map((row) => row.shareCapitalContribution)
                    )}
                  </DashboardTableHeaderCell>
                  <DashboardTableHeaderCell align="right">
                    Total share value
                  </DashboardTableHeaderCell>
                  <DashboardTableHeaderCell align="right">
                    {formatHeaderAmount(
                      getDividendHeaderLabel(segment),
                      segment.rows.map((row) => row.dividendCredit)
                    )}
                  </DashboardTableHeaderCell>
                  <DashboardTableHeaderCell align="right">
                    Final saving
                  </DashboardTableHeaderCell>
                  {segmentLoanColumns.map((loan) => (
                    <DashboardTableHeaderCell
                      align="right"
                      key={`${loan.id}-balance-header`}
                    >
                      {getLoanColumnLabel(loan, "balance")}
                    </DashboardTableHeaderCell>
                  ))}
                  <DashboardTableHeaderCell align="right">
                    Total saving
                  </DashboardTableHeaderCell>
                </DashboardTableHead>
                <DashboardTableBody>
                  {segment.rows.map((row) => {
                    const loan = row.loanColumns[0]
                    const adjustmentsDisabled = isRowAdjustmentDisabled(row)

                    return (
                      <DashboardTableRow key={`${segment.key}-${row.period}`}>
                        <DashboardTableCell>
                          <div>
                            <p className="font-medium">{row.period}</p>
                            {row.isEdited ? (
                              <p className="mt-1 text-xs text-amber-700">
                                One-time override
                              </p>
                            ) : null}
                          </div>
                        </DashboardTableCell>
                        {segmentLoanColumns.map((segmentLoan) => {
                          const rowLoan = row.loanColumns.find(
                            (item) => item.id === segmentLoan.id
                          )

                          return (
                            <DashboardTableCell
                              align="right"
                              key={`${segmentLoan.id}-repayment`}
                            >
                              {rowLoan ? (
                                <div className="flex flex-col items-end gap-1">
                                  {renderRepaymentControl(
                                    row,
                                    rowLoan,
                                    adjustmentsDisabled
                                  )}
                                  {rowLoan.repaymentOnTime ? (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                      On-time
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                "-"
                              )}
                            </DashboardTableCell>
                          )
                        })}
                        <DashboardTableCell align="right">
                          {renderSavingsControl(
                            row,
                            row.loanColumns,
                            adjustmentsDisabled
                          )}
                        </DashboardTableCell>
                        {segment.summary.chargeLabels.map((chargeLabel) => (
                          <DashboardTableCell key={chargeLabel} align="right">
                            {formatCurrency(
                              row.chargeDeductions[chargeLabel] ?? 0
                            )}
                          </DashboardTableCell>
                        ))}
                        <DashboardTableCell align="right">
                          {formatCurrency(row.shareCapitalContribution)}
                        </DashboardTableCell>
                        <DashboardTableCell align="right">
                          {formatCurrency(row.runningShareCapitalBalance)}
                        </DashboardTableCell>
                        <DashboardTableCell align="right">
                          <div className="flex min-w-[180px] flex-col items-end gap-2">
                            <p className="font-medium">
                              {formatCurrency(row.dividendCredit)}
                            </p>
                            {row.dividendLabel ? (
                              <p className="max-w-[220px] text-xs text-muted-foreground">
                                {row.dividendLabel}
                              </p>
                            ) : null}
                            {renderProfitControl(row)}
                          </div>
                        </DashboardTableCell>
                        <DashboardTableCell align="right">
                          {formatCurrency(row.netSavingsContribution)}
                        </DashboardTableCell>
                        {segmentLoanColumns.map((segmentLoan) => {
                          const rowLoan = row.loanColumns.find(
                            (item) => item.id === segmentLoan.id
                          )

                          return (
                            <DashboardTableCell
                              align="right"
                              key={`${segmentLoan.id}-balance`}
                            >
                              {rowLoan
                                ? formatCurrency(
                                    rowLoan.outstandingPrincipalBalance
                                  )
                                : "-"}
                            </DashboardTableCell>
                          )
                        })}
                        <DashboardTableCell align="right">
                          {formatCurrency(row.runningSavingsBalance)}
                        </DashboardTableCell>
                      </DashboardTableRow>
                    )
                  })}
                </DashboardTableBody>
              </DashboardTable>
            </DashboardDataTable>
          </DashboardSurfaceCard>
        )
      })}
    </div>
  )
}
