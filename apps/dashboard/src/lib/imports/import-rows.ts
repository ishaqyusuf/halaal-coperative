import type { DashboardImportKind } from "@/lib/import-csv"
import { formatDayMonthYear } from "@/utils/format"

type Payload = Record<string, unknown>

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value)
}

function amount(value: unknown) {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function day(value: unknown) {
  return typeof value === "string" || value instanceof Date
    ? (formatDayMonthYear(value) ?? "")
    : ""
}

function join(...parts: string[]) {
  return parts.filter(Boolean).join(" · ")
}

/** One saved import row in plain words, for a batch's "In the file" list. */
export function describeImportRow(
  kind: DashboardImportKind,
  payload: unknown
): { amount: number | null; detail: string; title: string } {
  const row = (payload && typeof payload === "object" ? payload : {}) as Payload

  switch (kind) {
    case "members":
      return {
        amount: null,
        detail: join(text(row.memberNumber), text(row.phoneNumber)),
        title: text(row.fullName) || text(row.memberNumber),
      }
    case "deduction_sources":
      return {
        amount: null,
        detail: join(
          text(row.type).replaceAll("_", " "),
          text(row.externalReference)
        ),
        title: text(row.name),
      }
    case "loan_products":
      return {
        amount: null,
        detail: join(
          row.termMonths ? `${text(row.termMonths)} months to repay` : "",
          row.maxSavingsMultiple
            ? `up to ${text(row.maxSavingsMultiple)} times savings`
            : ""
        ),
        title: text(row.name),
      }
    case "contributions":
      return {
        amount: amount(row.amount),
        detail: join(
          day(row.postedAt),
          text(row.periodLabel),
          text(row.reference)
        ),
        title: text(row.memberNumber),
      }
    case "charges":
      return {
        amount: amount(row.amount),
        detail: join(text(row.name), day(row.assessedAt)),
        title: text(row.memberNumber),
      }
    case "loan_migrations":
      return {
        amount: amount(row.outstandingPrincipal),
        detail: join(text(row.loanProductName), "still owed"),
        title: text(row.memberNumber),
      }
    case "repayment_migrations":
      return {
        amount: amount(row.amount),
        detail: join(text(row.loanProductName), text(row.reference)),
        title: text(row.memberNumber),
      }
  }
}
