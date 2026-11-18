import { LOAN_EXPORT_DATE_RULE, type LoanExportRow } from "@halaalvest/db"
import type { CsvCell } from "./csv"

/** Loans export columns (triage 0.8). */
export const LOANS_EXPORT_HEADERS = [
  "Record Type",
  "Member",
  "Member Number",
  "Product",
  "Product Code",
  "Date Used",
  "Date",
  "Asked For On",
  "Paid Out On",
  "Requested Amount",
  "Principal Amount",
  "Outstanding Principal",
  "Requested Term Months",
  "Loan Term Months",
  "Estimated Monthly Servicing",
  "Extra Monthly Savings Amount",
  "Status",
]

function formatDay(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : ""
}

/** The line above the header row: which date each row is filtered by. */
export function describeLoansExportDates(filters: {
  fromDate?: Date
  toDate?: Date
}) {
  const range =
    filters.fromDate && filters.toDate
      ? ` Dates from ${formatDay(filters.fromDate)} to ${formatDay(filters.toDate)}.`
      : filters.fromDate
        ? ` Dates from ${formatDay(filters.fromDate)}.`
        : filters.toDate
          ? ` Dates up to ${formatDay(filters.toDate)}.`
          : " All dates."

  return `${LOAN_EXPORT_DATE_RULE}${range}`
}

export function toLoansExportCsvRow(row: LoanExportRow): CsvCell[] {
  return [
    row.recordType,
    row.memberName,
    row.memberNumber,
    row.productName,
    row.productCode ?? "",
    row.dateUsedLabel,
    row.dateUsed.toISOString(),
    row.requestedAt.toISOString(),
    row.paidOutAt?.toISOString() ?? "",
    row.requestedAmount ?? "",
    row.principalAmount ?? "",
    row.outstandingPrincipal ?? "",
    row.requestedTermMonths ?? "",
    row.loanTermMonths ?? "",
    row.estimatedMonthlyServicing,
    row.extraMonthlySavingsAmount,
    row.status,
  ]
}
