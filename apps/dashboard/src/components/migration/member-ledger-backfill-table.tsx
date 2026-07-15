import type {
  EffectiveDateSegment,
  MemberLedgerBackfillLoanColumn,
  MemberLedgerBackfillRow,
  MonthlyLedgerSegment,
} from "@halaalvest/backfill"
import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import { DashboardSurfaceCard } from "@/components/dashboard"
import { LedgerColumnVisibilityFrame } from "@/components/migration/ledger-column-visibility-frame"

type MemberLedgerBackfillTableProps = {
  isRowAdjustmentDisabled: (row: MemberLedgerBackfillRow) => boolean
  renderDefaultingControl?: (
    row: MemberLedgerBackfillRow,
    disabled: boolean,
    triggerLabel?: string
  ) => React.ReactNode
  renderMonthStatusControl?: (
    row: MemberLedgerBackfillRow,
    disabled: boolean
  ) => React.ReactNode
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
    return formatCurrency(uniqueValues[0] ?? 0)
  }

  return `${formatCurrency(Math.min(...uniqueValues))} - ${formatCurrency(
    Math.max(...uniqueValues)
  )}`
}

function formatHeaderAmount(label: string, values: number[]) {
  return `${label} (${formatAmountRange(values)})`
}

function formatSegmentAmountSummary(summary: {
  maxAmount: number
  minAmount: number
}) {
  if (summary.minAmount === summary.maxAmount) {
    return formatCurrency(summary.minAmount)
  }

  return `${formatCurrency(summary.minAmount)} - ${formatCurrency(
    summary.maxAmount
  )}`
}

function getSegmentLoanColumns(segment: MonthlyLedgerSegment) {
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

function getLoanColumnLabel(
  loan: Pick<MemberLedgerBackfillLoanColumn, "label">,
  suffix: string
) {
  return `${loan.label} ${suffix}`
}

function formatCompactPeriod(period: string) {
  const [month, year] = period.split(/\s+/)

  if (!month || !year) {
    return period
  }

  return `${month.slice(0, 3).toUpperCase()} ${year.slice(-2)}`
}

const ledgerDomainColor = {
  charge: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    value:
      "text-amber-700 dark:text-amber-300 [&_button]:text-amber-700 dark:[&_button]:text-amber-300",
  },
  loan: {
    dot: "bg-indigo-500",
    text: "text-indigo-700 dark:text-indigo-300",
    value:
      "text-indigo-700 dark:text-indigo-300 [&_button]:text-indigo-700 dark:[&_button]:text-indigo-300",
  },
  profit: {
    dot: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-300",
    value:
      "text-violet-700 dark:text-violet-300 [&_button]:text-violet-700 dark:[&_button]:text-violet-300",
  },
  repayment: {
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    value:
      "text-rose-700 dark:text-rose-300 [&_button]:text-rose-700 dark:[&_button]:text-rose-300",
  },
  saving: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    value:
      "text-emerald-700 dark:text-emerald-300 [&_button]:text-emerald-700 dark:[&_button]:text-emerald-300",
  },
  share: {
    dot: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-300",
    value:
      "text-sky-700 dark:text-sky-300 [&_button]:text-sky-700 dark:[&_button]:text-sky-300",
  },
}

type LedgerDomainKey = keyof typeof ledgerDomainColor

const ledgerLegendItems: Array<{ key: LedgerDomainKey; label: string }> = [
  { key: "saving", label: "Saving" },
  { key: "repayment", label: "Loan payment" },
  { key: "loan", label: "Loan" },
  { key: "charge", label: "Charge" },
  { key: "share", label: "Share capital" },
  { key: "profit", label: "Business profit" },
]

function LedgerDomainValue({
  children,
  className,
  domain,
}: {
  children: React.ReactNode
  className?: string
  domain: LedgerDomainKey
}) {
  return (
    <span
      className={cn("font-medium", ledgerDomainColor[domain].value, className)}
    >
      {children}
    </span>
  )
}

function LedgerColorLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium">
      {ledgerLegendItems.map((item) => (
        <span className="inline-flex items-center gap-1.5" key={item.key}>
          <span
            aria-hidden="true"
            className={cn(
              "size-2 rounded-full",
              ledgerDomainColor[item.key].dot
            )}
          />
          <span className={ledgerDomainColor[item.key].text}>{item.label}</span>
        </span>
      ))}
    </div>
  )
}

function LedgerActionMenu({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Open row actions"
            size="icon-xs"
            type="button"
            variant="ghost"
          />
        }
      >
        <span aria-hidden="true" className="text-base leading-none">
          ...
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-max min-w-40 p-1">
        <div className="grid gap-1">{children}</div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function LedgerActionItem({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function LedgerMetricBlock({
  children,
  className,
  label,
}: {
  children: React.ReactNode
  className?: string
  label: string
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium text-foreground">{children}</div>
    </div>
  )
}

function SegmentReasonList({ reasons }: { reasons: string[] }) {
  return (
    <div className="mb-1 flex flex-wrap gap-1.5">
      {reasons.map((reason) => (
        <span
          className="text-[11px] font-semibold text-muted-foreground uppercase"
          key={reason}
        >
          {reason}
        </span>
      ))}
    </div>
  )
}

function MonthlyLedgerSegmentTable({
  isRowAdjustmentDisabled,
  renderDefaultingControl,
  renderMonthStatusControl,
  renderRepaymentControl,
  renderSavingsControl,
  segment,
}: {
  isRowAdjustmentDisabled: (row: MemberLedgerBackfillRow) => boolean
  renderDefaultingControl?: (
    row: MemberLedgerBackfillRow,
    disabled: boolean,
    triggerLabel?: string
  ) => React.ReactNode
  renderMonthStatusControl?: (
    row: MemberLedgerBackfillRow,
    disabled: boolean
  ) => React.ReactNode
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
  segment: MonthlyLedgerSegment
}) {
  const segmentLoanColumns = getSegmentLoanColumns(segment)
  const chargeColumns = segment.summary.chargeSummaries
  const forceSavingsColumn = segment.summary.hasManualSavingsAdjustment
  const forceRepaymentColumns = segment.summary.hasManualRepaymentAdjustment
  const firstSegmentRow = segment.rows[0]
  const segmentStatusControl =
    renderDefaultingControl && firstSegmentRow
      ? renderDefaultingControl(
          firstSegmentRow,
          isRowAdjustmentDisabled(firstSegmentRow),
          "Commitment status"
        )
      : null
  const visibilityColumns = [
    {
      defaultVisible: true,
      disabled: true,
      key: "period" as const,
      label: "Period",
    },
    {
      defaultVisible: true,
      disabled: forceSavingsColumn,
      key: "commitment" as const,
      label: "Commitment",
    },
    ...(chargeColumns.length > 0
      ? [
          {
            defaultVisible: true,
            key: "charges" as const,
            label: "Charges",
          },
        ]
      : []),
    ...(segmentLoanColumns.length > 0
      ? [
          {
            defaultVisible: true,
            disabled: forceRepaymentColumns,
            key: "repayment" as const,
            label: "Loan repayment",
          },
        ]
      : []),
    {
      defaultVisible: true,
      key: "share" as const,
      label: "Share capital",
    },
    {
      defaultVisible: true,
      disabled: true,
      key: "finalSaving" as const,
      label: "Final saving",
    },
    ...(segmentLoanColumns.length > 0
      ? [
          {
            defaultVisible: true,
            disabled: true,
            key: "loanBalance" as const,
            label: "Loan balance",
          },
        ]
      : []),
    {
      defaultVisible: true,
      disabled: true,
      key: "totalSaving" as const,
      label: "Total saving",
    },
    {
      defaultVisible: true,
      disabled: true,
      key: "action" as const,
      label: "Action",
    },
  ]
  const segmentMetadataItems = [
    {
      columnKey: "commitment" as const,
      label: "Commitment",
      labelClassName: ledgerDomainColor.saving.text,
      value: formatAmountRange(
        segment.rows.map((row) => row.savingsContribution)
      ),
    },
    ...chargeColumns.map((charge) => ({
      columnKey: "charges" as const,
      label: charge.label,
      labelClassName: ledgerDomainColor.charge.text,
      value: formatSegmentAmountSummary(charge),
    })),
    ...(segmentLoanColumns.length > 0
      ? [
          {
            columnKey: "repayment" as const,
            label: "Loan repayment",
            labelClassName: ledgerDomainColor.repayment.text,
            value: formatAmountRange(
              segment.rows.flatMap((row) =>
                row.loanColumns.map((loan) => loan.repaymentAmount)
              )
            ),
          },
        ]
      : []),
    {
      columnKey: "share" as const,
      label: "Share capital",
      labelClassName: ledgerDomainColor.share.text,
      value: formatSegmentAmountSummary(segment.summary.shareCapitalSummary),
    },
  ]

  return (
    <div>
      <SegmentReasonList reasons={segment.reasonList} />
      <LedgerColumnVisibilityFrame
        afterSavingsControl={segmentStatusControl}
        columns={visibilityColumns}
        metadataItems={segmentMetadataItems}
      >
        <div className="space-y-3">
          {segment.rows.map((row) => {
            const adjustmentsDisabled = isRowAdjustmentDisabled(row)

            return (
              <DashboardSurfaceCard
                as="article"
                className="rounded-lg"
                key={`${segment.key}-${row.period}`}
              >
                <div className="grid gap-4 xl:grid-cols-[7rem_minmax(0,1fr)_auto] xl:items-start">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Period
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatCompactPeriod(row.period)}
                    </p>
                    {row.isEdited &&
                    row.status !== "missed" &&
                    row.status !== "paused" ? (
                      <p className="mt-1 text-xs text-amber-700">
                        One-time override
                      </p>
                    ) : null}
                    {row.status === "missed" || row.status === "paused" ? (
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        {row.statusReason ??
                          (row.status === "missed" ? "Defaulting" : "Inactive")}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <LedgerMetricBlock
                      className="commitment-column"
                      label={formatHeaderAmount("Commitment", [
                        row.savingsContribution,
                      ])}
                    >
                      <LedgerDomainValue domain="saving">
                        {renderSavingsControl(
                          row,
                          row.loanColumns,
                          adjustmentsDisabled
                        )}
                      </LedgerDomainValue>
                    </LedgerMetricBlock>

                    {chargeColumns.map((charge) => (
                      <LedgerMetricBlock
                        className="charge-column"
                        key={`${charge.label}-charge-${row.period}`}
                        label={formatHeaderAmount(charge.label, [
                          row.chargeDeductions[charge.label] ?? 0,
                        ])}
                      >
                        <LedgerDomainValue domain="charge">
                          {formatCurrency(
                            row.chargeDeductions[charge.label] ?? 0
                          )}
                        </LedgerDomainValue>
                      </LedgerMetricBlock>
                    ))}

                    {segmentLoanColumns.map((segmentLoan) => {
                      const rowLoan = row.loanColumns.find(
                        (item) => item.id === segmentLoan.id
                      )

                      return (
                        <LedgerMetricBlock
                          className="repayment-column"
                          key={`${segmentLoan.id}-repayment`}
                          label={getLoanColumnLabel(
                            segmentLoan,
                            "repayment"
                          )}
                        >
                          {rowLoan ? (
                            <LedgerDomainValue domain="repayment">
                              {renderRepaymentControl(
                                row,
                                rowLoan,
                                adjustmentsDisabled
                              )}
                            </LedgerDomainValue>
                          ) : (
                            "-"
                          )}
                        </LedgerMetricBlock>
                      )
                    })}

                    <LedgerMetricBlock
                      className="share-column"
                      label="Total share value"
                    >
                      {formatCurrency(row.runningShareCapitalBalance)}
                    </LedgerMetricBlock>
                    <LedgerMetricBlock
                      className="final-saving-column"
                      label="Final saving"
                    >
                      {formatCurrency(row.netSavingsContribution)}
                    </LedgerMetricBlock>

                    {segmentLoanColumns.map((segmentLoan) => {
                      const rowLoan = row.loanColumns.find(
                        (item) => item.id === segmentLoan.id
                      )

                      return (
                        <LedgerMetricBlock
                          className="loan-balance-column"
                          key={`${segmentLoan.id}-balance`}
                          label={getLoanColumnLabel(segmentLoan, "balance")}
                        >
                          {rowLoan
                            ? formatCurrency(
                                rowLoan.outstandingPrincipalBalance
                              )
                            : "-"}
                        </LedgerMetricBlock>
                      )
                    })}

                    <LedgerMetricBlock
                      className="total-saving-column"
                      label="Total saving"
                    >
                      {formatCurrency(row.runningSavingsBalance)}
                    </LedgerMetricBlock>
                  </div>

                  <div className="flex justify-start xl:justify-end">
                    <LedgerActionMenu>
                      <LedgerActionItem label="Savings">
                        <LedgerDomainValue domain="saving">
                          {renderSavingsControl(
                            row,
                            row.loanColumns,
                            adjustmentsDisabled
                          )}
                        </LedgerDomainValue>
                      </LedgerActionItem>
                      {row.loanColumns.map((rowLoan) => (
                        <LedgerActionItem
                          key={rowLoan.id}
                          label={rowLoan.label}
                        >
                          <div className="flex items-center gap-1">
                            <LedgerDomainValue domain="repayment">
                              {renderRepaymentControl(
                                row,
                                rowLoan,
                                adjustmentsDisabled
                              )}
                            </LedgerDomainValue>
                            {rowLoan.repaymentOnTime ? (
                              <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                On-time
                              </span>
                            ) : null}
                          </div>
                        </LedgerActionItem>
                      ))}
                      {chargeColumns.map((charge) => (
                        <LedgerActionItem
                          key={`${charge.label}-action`}
                          label={charge.label}
                        >
                          <LedgerDomainValue domain="charge">
                            {formatCurrency(
                              row.chargeDeductions[charge.label] ?? 0
                            )}
                          </LedgerDomainValue>
                        </LedgerActionItem>
                      ))}
                      {renderMonthStatusControl ? (
                        <LedgerActionItem label="Month status">
                          {renderMonthStatusControl(row, adjustmentsDisabled)}
                        </LedgerActionItem>
                      ) : null}
                    </LedgerActionMenu>
                  </div>
                </div>
              </DashboardSurfaceCard>
            )
          })}
        </div>
      </LedgerColumnVisibilityFrame>
    </div>
  )
}

export function MemberLedgerBackfillTable({
  isRowAdjustmentDisabled,
  renderDefaultingControl,
  renderMonthStatusControl,
  renderRepaymentControl,
  renderSavingsControl,
  segments,
}: MemberLedgerBackfillTableProps) {
  if (segments.length === 0) {
    return (
      <div>
        <p className="text-sm font-semibold text-foreground">
          No generated ledger preview
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a member above to load historical ledger rows from the current
          migration setup.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <LedgerColorLegend />
      {segments.map((segment) => {
        if (segment.kind === "profit") {
          const row = segment.row
          const profitRunningSavingsBalance =
            row.runningSavingsBalance -
            row.netSavingsContribution +
            row.dividendCredit

          return (
            <div key={segment.key}>
              <SegmentReasonList reasons={segment.reasonList} />
              <DashboardSurfaceCard
                as="article"
                className="rounded-lg"
              >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[7rem_minmax(0,1.2fr)_6rem_9rem_minmax(0,1fr)_9rem_auto] xl:items-center">
                  <LedgerMetricBlock label="Period">
                    {formatCompactPeriod(row.period)}
                  </LedgerMetricBlock>
                  <LedgerMetricBlock label="Business profit">
                    <span
                      className={cn(
                        "font-medium",
                        ledgerDomainColor.profit.text
                      )}
                    >
                      {row.dividendLabel ?? "Business profit"}
                    </span>
                  </LedgerMetricBlock>
                  <LedgerMetricBlock label="Share %">
                    <LedgerDomainValue domain="profit">
                      {row.dividendSharePercentage == null
                        ? "-"
                        : `${row.dividendSharePercentage}%`}
                    </LedgerDomainValue>
                  </LedgerMetricBlock>
                  <LedgerMetricBlock label="Member amount">
                    <LedgerDomainValue domain="profit">
                      {formatCurrency(row.dividendCredit)}
                    </LedgerDomainValue>
                  </LedgerMetricBlock>
                  <LedgerMetricBlock label="Source">
                    <span className="text-muted-foreground">
                      {row.dividendProfitEntryId
                        ? "Migration profit allocation"
                        : "Existing dividend allocation"}
                    </span>
                  </LedgerMetricBlock>
                  <LedgerMetricBlock label="Total saving">
                    {formatCurrency(profitRunningSavingsBalance)}
                  </LedgerMetricBlock>
                  <LedgerMetricBlock label="Action">-</LedgerMetricBlock>
                </div>
              </DashboardSurfaceCard>
            </div>
          )
        }

        if (segment.kind === "loan_taken") {
          const { loan, row } = segment

          return (
            <div key={segment.key}>
              <SegmentReasonList reasons={segment.reasonList} />
              <DashboardSurfaceCard
                as="article"
                className="rounded-lg"
              >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[7rem_9rem_9rem_9rem_5rem_9rem_minmax(0,1fr)_auto] xl:items-center">
                  <LedgerMetricBlock label="Period">
                    {formatCompactPeriod(row.period)}
                  </LedgerMetricBlock>
                  <LedgerMetricBlock label="Amount">
                    <LedgerDomainValue domain="loan">
                      {formatCurrency(loan.amount)}
                    </LedgerDomainValue>
                  </LedgerMetricBlock>
                  <LedgerMetricBlock label="Repay amount">
                    <LedgerDomainValue domain="loan">
                      {formatCurrency(loan.repaymentAmount)}
                    </LedgerDomainValue>
                  </LedgerMetricBlock>
                  <LedgerMetricBlock label="Commitment">
                    <LedgerDomainValue domain="loan">
                      {formatCurrency(loan.commitmentAmount)}
                    </LedgerDomainValue>
                  </LedgerMetricBlock>
                  <LedgerMetricBlock label="Term">
                    {loan.termMonths} mo
                  </LedgerMetricBlock>
                  <LedgerMetricBlock label="Opening pending">
                    <LedgerDomainValue domain="loan">
                      {formatCurrency(loan.openingPendingAmount)}
                    </LedgerDomainValue>
                  </LedgerMetricBlock>
                  <LedgerMetricBlock label="Loan">
                    <span className={ledgerDomainColor.loan.text}>
                      {loan.label}
                    </span>
                  </LedgerMetricBlock>
                  <LedgerMetricBlock label="Action">-</LedgerMetricBlock>
                </div>
              </DashboardSurfaceCard>
            </div>
          )
        }

        return (
          <MonthlyLedgerSegmentTable
            isRowAdjustmentDisabled={isRowAdjustmentDisabled}
            key={segment.key}
            renderDefaultingControl={renderDefaultingControl}
            renderMonthStatusControl={renderMonthStatusControl}
            renderRepaymentControl={renderRepaymentControl}
            renderSavingsControl={renderSavingsControl}
            segment={segment}
          />
        )
      })}
    </div>
  )
}
