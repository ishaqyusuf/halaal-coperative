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
import {
  DashboardDataTable,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
} from "@/components/dashboard"
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

function getLoanColumnValues(
  segment: MonthlyLedgerSegment,
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

function formatCompactPeriod(period: string) {
  const [month, year] = period.split(/\s+/)

  if (!month || !year) {
    return period
  }

  return `${month.slice(0, 3).toUpperCase()} ${year.slice(-2)}`
}

function isStampDutyLabel(label: string) {
  return /stamp(?:\s+duty)?/i.test(label)
}

const compactTableClass =
  "w-max min-w-full table-fixed text-xs [&_td]:border-r [&_td]:border-border/60 [&_td]:px-1.5 [&_td]:py-1.5 [&_td]:whitespace-nowrap [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-border/60 [&_th]:px-1.5 [&_th]:py-1.5 [&_th]:leading-3 [&_th]:whitespace-normal [&_th:last-child]:border-r-0"
const segmentDataTableClass = "overflow-visible rounded-none"
const segmentDataTableContentClass = "overflow-visible"
const stickySegmentHeadClass =
  "bg-muted/95 [&_th]:sticky [&_th]:top-[70px] [&_th]:z-20 [&_th]:bg-muted/95 [&_th]:shadow-sm [&_th]:backdrop-blur"

const columnClass = {
  label: "w-28",
  money: "w-20",
  period: "w-16",
  percent: "w-14",
  source: "w-28",
  term: "w-14",
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

function domainHeaderClass(domain: LedgerDomainKey, className?: string) {
  return cn(className, ledgerDomainColor[domain].text)
}

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

function SegmentReasonList({ reasons }: { reasons: string[] }) {
  return (
    <div className="mb-1 flex flex-wrap gap-1.5">
      {reasons.map((reason) => (
        <span
          className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
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
  const stampDutyCharge = segment.summary.chargeSummaries.find((charge) =>
    isStampDutyLabel(charge.label)
  )
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
    ...(stampDutyCharge
      ? [
          {
            defaultVisible: false,
            key: "stampDuty" as const,
            label: "Stamp duty",
          },
        ]
      : []),
    ...(segmentLoanColumns.length > 0
      ? [
          {
            defaultVisible: false,
            disabled: forceRepaymentColumns,
            key: "repayment" as const,
            label: "Loan repayment",
          },
        ]
      : []),
    {
      defaultVisible: false,
      disabled: forceSavingsColumn,
      key: "commitment" as const,
      label: "Commitment",
    },
    {
      defaultVisible: false,
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
    ...(stampDutyCharge
      ? [
          {
            columnKey: "stampDuty" as const,
            label: "Stamp duty",
            labelClassName: ledgerDomainColor.charge.text,
            value: formatSegmentAmountSummary(stampDutyCharge),
          },
        ]
      : []),
    {
      columnKey: "share" as const,
      label: "Share capital",
      labelClassName: ledgerDomainColor.share.text,
      value: formatSegmentAmountSummary(segment.summary.shareCapitalSummary),
    },
    {
      columnKey: "commitment" as const,
      label: "Commitment",
      labelClassName: ledgerDomainColor.saving.text,
      value: formatAmountRange(
        segment.rows.map((row) => row.savingsContribution)
      ),
    },
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
  ]

  return (
    <div>
      <SegmentReasonList reasons={segment.reasonList} />
      <LedgerColumnVisibilityFrame
        afterSavingsControl={segmentStatusControl}
        columns={visibilityColumns}
        metadataItems={segmentMetadataItems}
      >
        <DashboardDataTable
          className={segmentDataTableClass}
          contentClassName={segmentDataTableContentClass}
        >
          <DashboardTable className={compactTableClass}>
            <colgroup>
              <col className={columnClass.period} />
              {stampDutyCharge ? (
                <col className={cn(columnClass.money, "stamp-duty-column")} />
              ) : null}
              {segmentLoanColumns.map((loan) => (
                <col
                  className={cn(columnClass.money, "repayment-column")}
                  key={`${loan.id}-repayment-col`}
                />
              ))}
              <col className={cn(columnClass.money, "commitment-column")} />
              <col className={cn(columnClass.money, "share-column")} />
              <col className={cn(columnClass.money, "final-saving-column")} />
              {segmentLoanColumns.map((loan) => (
                <col
                  className={cn(columnClass.money, "loan-balance-column")}
                  key={`${loan.id}-balance-col`}
                />
              ))}
              <col className="total-saving-column" />
              <col />
            </colgroup>
            <DashboardTableHead className={stickySegmentHeadClass}>
              <DashboardTableHeaderCell className={columnClass.period}>
                Period
              </DashboardTableHeaderCell>
              {stampDutyCharge ? (
                <DashboardTableHeaderCell
                  align="right"
                  className={domainHeaderClass(
                    "charge",
                    cn(columnClass.money, "stamp-duty-column")
                  )}
                >
                  {formatHeaderAmount(
                    "Stamp duty",
                    segment.rows.map(
                      (row) => row.chargeDeductions[stampDutyCharge.label] ?? 0
                    )
                  )}
                </DashboardTableHeaderCell>
              ) : null}
              {segmentLoanColumns.map((loan) => (
                <DashboardTableHeaderCell
                  align="right"
                  className={domainHeaderClass(
                    "repayment",
                    cn(columnClass.money, "repayment-column")
                  )}
                  key={`${loan.id}-repayment-header`}
                >
                  {formatHeaderAmount(
                    getLoanColumnLabel(loan, "repayment"),
                    getLoanColumnValues(segment, loan.id, "repaymentAmount")
                  )}
                </DashboardTableHeaderCell>
              ))}
              <DashboardTableHeaderCell
                align="right"
                className={domainHeaderClass(
                  "saving",
                  cn(columnClass.money, "commitment-column")
                )}
              >
                {formatHeaderAmount(
                  "Commitment",
                  segment.rows.map((row) => row.savingsContribution)
                )}
              </DashboardTableHeaderCell>
              <DashboardTableHeaderCell
                align="right"
                className={cn(columnClass.money, "share-column")}
              >
                Total share value
              </DashboardTableHeaderCell>
              <DashboardTableHeaderCell
                align="right"
                className={cn(columnClass.money, "final-saving-column")}
              >
                Final saving
              </DashboardTableHeaderCell>
              {segmentLoanColumns.map((loan) => (
                <DashboardTableHeaderCell
                  align="right"
                  className={cn(columnClass.money, "loan-balance-column")}
                  key={`${loan.id}-balance-header`}
                >
                  {getLoanColumnLabel(loan, "balance")}
                </DashboardTableHeaderCell>
              ))}
              <DashboardTableHeaderCell
                align="right"
                className="total-saving-column"
              >
                Total saving
              </DashboardTableHeaderCell>
              <DashboardTableHeaderCell align="right">
                Action
              </DashboardTableHeaderCell>
            </DashboardTableHead>
            <DashboardTableBody>
              {segment.rows.map((row) => {
                const adjustmentsDisabled = isRowAdjustmentDisabled(row)

                return (
                  <DashboardTableRow key={`${segment.key}-${row.period}`}>
                    <DashboardTableCell className={columnClass.period}>
                      <div>
                        <p className="font-medium">
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
                              (row.status === "missed"
                                ? "Defaulting"
                                : "Inactive")}
                          </p>
                        ) : null}
                      </div>
                    </DashboardTableCell>
                    {stampDutyCharge ? (
                      <DashboardTableCell
                        align="right"
                        className={cn(columnClass.money, "stamp-duty-column")}
                      >
                        <LedgerDomainValue domain="charge">
                          {formatCurrency(
                            row.chargeDeductions[stampDutyCharge.label] ?? 0
                          )}
                        </LedgerDomainValue>
                      </DashboardTableCell>
                    ) : null}
                    {segmentLoanColumns.map((segmentLoan) => {
                      const rowLoan = row.loanColumns.find(
                        (item) => item.id === segmentLoan.id
                      )

                      return (
                        <DashboardTableCell
                          align="right"
                          className={cn(columnClass.money, "repayment-column")}
                          key={`${segmentLoan.id}-repayment`}
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
                        </DashboardTableCell>
                      )
                    })}
                    <DashboardTableCell
                      align="right"
                      className={cn(columnClass.money, "commitment-column")}
                    >
                      <LedgerDomainValue domain="saving">
                        {renderSavingsControl(
                          row,
                          row.loanColumns,
                          adjustmentsDisabled
                        )}
                      </LedgerDomainValue>
                    </DashboardTableCell>
                    <DashboardTableCell
                      align="right"
                      className={cn(columnClass.money, "share-column")}
                    >
                      {formatCurrency(row.runningShareCapitalBalance)}
                    </DashboardTableCell>
                    <DashboardTableCell
                      align="right"
                      className={cn(columnClass.money, "final-saving-column")}
                    >
                      {formatCurrency(row.netSavingsContribution)}
                    </DashboardTableCell>
                    {segmentLoanColumns.map((segmentLoan) => {
                      const rowLoan = row.loanColumns.find(
                        (item) => item.id === segmentLoan.id
                      )

                      return (
                        <DashboardTableCell
                          align="right"
                          className={cn(
                            columnClass.money,
                            "loan-balance-column"
                          )}
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
                    <DashboardTableCell
                      align="right"
                      className="total-saving-column"
                    >
                      {formatCurrency(row.runningSavingsBalance)}
                    </DashboardTableCell>
                    <DashboardTableCell align="right">
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
                        {renderMonthStatusControl ? (
                          <LedgerActionItem label="Month status">
                            {renderMonthStatusControl(row, adjustmentsDisabled)}
                          </LedgerActionItem>
                        ) : null}
                      </LedgerActionMenu>
                    </DashboardTableCell>
                  </DashboardTableRow>
                )
              })}
            </DashboardTableBody>
          </DashboardTable>
        </DashboardDataTable>
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
              <DashboardDataTable
                className={segmentDataTableClass}
                contentClassName={segmentDataTableContentClass}
              >
                <DashboardTable className={compactTableClass}>
                  <colgroup>
                    <col className={columnClass.period} />
                    <col className={columnClass.label} />
                    <col className={columnClass.percent} />
                    <col className={columnClass.money} />
                    <col className={columnClass.source} />
                    <col />
                    <col />
                  </colgroup>
                  <DashboardTableHead className={stickySegmentHeadClass}>
                    <DashboardTableHeaderCell className={columnClass.period}>
                      Period
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell
                      className={domainHeaderClass("profit", columnClass.label)}
                    >
                      Business profit
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell
                      align="right"
                      className={domainHeaderClass(
                        "profit",
                        columnClass.percent
                      )}
                    >
                      Share %
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell
                      align="right"
                      className={domainHeaderClass("profit", columnClass.money)}
                    >
                      Member amount
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell className={columnClass.source}>
                      Source/label
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell align="right">
                      Total saving
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell align="right">
                      Action
                    </DashboardTableHeaderCell>
                  </DashboardTableHead>
                  <DashboardTableBody>
                    <DashboardTableRow>
                      <DashboardTableCell className={columnClass.period}>
                        <p className="font-medium">
                          {formatCompactPeriod(row.period)}
                        </p>
                      </DashboardTableCell>
                      <DashboardTableCell className={columnClass.label}>
                        <p
                          className={cn(
                            "truncate font-medium",
                            ledgerDomainColor.profit.text
                          )}
                        >
                          {row.dividendLabel ?? "Business profit"}
                        </p>
                      </DashboardTableCell>
                      <DashboardTableCell
                        align="right"
                        className={columnClass.percent}
                      >
                        <LedgerDomainValue domain="profit">
                          {row.dividendSharePercentage == null
                            ? "-"
                            : `${row.dividendSharePercentage}%`}
                        </LedgerDomainValue>
                      </DashboardTableCell>
                      <DashboardTableCell
                        align="right"
                        className={columnClass.money}
                      >
                        <LedgerDomainValue domain="profit">
                          {formatCurrency(row.dividendCredit)}
                        </LedgerDomainValue>
                      </DashboardTableCell>
                      <DashboardTableCell className={columnClass.source}>
                        <p className="truncate text-muted-foreground">
                          {row.dividendProfitEntryId
                            ? "Migration profit allocation"
                            : "Existing dividend allocation"}
                        </p>
                      </DashboardTableCell>
                      <DashboardTableCell align="right">
                        {formatCurrency(profitRunningSavingsBalance)}
                      </DashboardTableCell>
                      <DashboardTableCell align="right">-</DashboardTableCell>
                    </DashboardTableRow>
                  </DashboardTableBody>
                </DashboardTable>
              </DashboardDataTable>
            </div>
          )
        }

        if (segment.kind === "loan_taken") {
          const { loan, row } = segment

          return (
            <div key={segment.key}>
              <SegmentReasonList reasons={segment.reasonList} />
              <DashboardDataTable
                className={segmentDataTableClass}
                contentClassName={segmentDataTableContentClass}
              >
                <DashboardTable className={compactTableClass}>
                  <colgroup>
                    <col className={columnClass.period} />
                    <col className={columnClass.money} />
                    <col className={columnClass.money} />
                    <col className={columnClass.money} />
                    <col className={columnClass.term} />
                    <col className={columnClass.money} />
                    <col className={columnClass.label} />
                    <col />
                  </colgroup>
                  <DashboardTableHead className={stickySegmentHeadClass}>
                    <DashboardTableHeaderCell className={columnClass.period}>
                      Period
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell
                      align="right"
                      className={domainHeaderClass("loan", columnClass.money)}
                    >
                      Amount
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell
                      align="right"
                      className={domainHeaderClass("loan", columnClass.money)}
                    >
                      Repay amount
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell
                      align="right"
                      className={domainHeaderClass("loan", columnClass.money)}
                    >
                      Commitment
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell
                      align="right"
                      className={columnClass.term}
                    >
                      Term
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell
                      align="right"
                      className={domainHeaderClass("loan", columnClass.money)}
                    >
                      Opening pending
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell
                      className={domainHeaderClass("loan", columnClass.label)}
                    >
                      Loan
                    </DashboardTableHeaderCell>
                    <DashboardTableHeaderCell align="right">
                      Action
                    </DashboardTableHeaderCell>
                  </DashboardTableHead>
                  <DashboardTableBody>
                    <DashboardTableRow>
                      <DashboardTableCell className={columnClass.period}>
                        <p className="font-medium">
                          {formatCompactPeriod(row.period)}
                        </p>
                      </DashboardTableCell>
                      <DashboardTableCell
                        align="right"
                        className={columnClass.money}
                      >
                        <LedgerDomainValue domain="loan">
                          {formatCurrency(loan.amount)}
                        </LedgerDomainValue>
                      </DashboardTableCell>
                      <DashboardTableCell
                        align="right"
                        className={columnClass.money}
                      >
                        <LedgerDomainValue domain="loan">
                          {formatCurrency(loan.repaymentAmount)}
                        </LedgerDomainValue>
                      </DashboardTableCell>
                      <DashboardTableCell
                        align="right"
                        className={columnClass.money}
                      >
                        <LedgerDomainValue domain="loan">
                          {formatCurrency(loan.commitmentAmount)}
                        </LedgerDomainValue>
                      </DashboardTableCell>
                      <DashboardTableCell
                        align="right"
                        className={columnClass.term}
                      >
                        {loan.termMonths} mo
                      </DashboardTableCell>
                      <DashboardTableCell
                        align="right"
                        className={columnClass.money}
                      >
                        <LedgerDomainValue domain="loan">
                          {formatCurrency(loan.openingPendingAmount)}
                        </LedgerDomainValue>
                      </DashboardTableCell>
                      <DashboardTableCell className={columnClass.label}>
                        <p
                          className={cn(
                            "truncate",
                            ledgerDomainColor.loan.text
                          )}
                        >
                          {loan.label}
                        </p>
                      </DashboardTableCell>
                      <DashboardTableCell align="right">-</DashboardTableCell>
                    </DashboardTableRow>
                  </DashboardTableBody>
                </DashboardTable>
              </DashboardDataTable>
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
