import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"

/**
 * Loans export (triage 0.8). Each loan request appears once:
 *
 * - a **loan** row once the money was paid out, dated and filtered by the
 *   payout date (`loans.disbursed_at`);
 * - a **request** row while it is not paid out yet (waiting, declined, or
 *   approved but not paid out), dated and filtered by the date it was asked
 *   for (`loan_requests.requested_at`).
 *
 * Imported loans that are being repaid but carry no payout date use the date
 * they were asked for. Filtering and ordering happen in SQL, one keyset batch
 * per statement, so the dashboard can stream the CSV.
 */
export const LOAN_EXPORT_DATE_RULE =
  "Loans are listed by the date they were paid out. Requests not yet paid out are listed by the date they were asked for."

export type LoanExportRecordType = "loan" | "request"

export type LoanExportRow = {
  /** Keyset cursor for the row after this one. */
  cursor: string
  /** The date the filter used: payout date for loans, request date otherwise. */
  dateUsed: Date
  dateUsedLabel: "Asked for" | "Paid out"
  estimatedMonthlyServicing: number
  extraMonthlySavingsAmount: number
  id: string
  loanTermMonths: number | null
  memberName: string
  memberNumber: string
  outstandingPrincipal: number | null
  paidOutAt: Date | null
  principalAmount: number | null
  productCode: string | null
  productName: string
  recordType: LoanExportRecordType
  requestedAmount: number | null
  requestedAt: Date
  requestedTermMonths: number | null
  status: string
}

type LoanExportSqlRow = {
  dateUsed: Date
  estimatedMonthlyServicing: unknown
  extraMonthlySavingsAmount: unknown
  id: string
  kindRank: number
  loanTermMonths: number | null
  memberName: string
  memberNumber: string
  outstandingPrincipal: unknown
  paidOutAt: Date | null
  principalAmount: unknown
  productCode: string | null
  productName: string
  requestedAmount: unknown
  requestedAt: Date
  requestedTermMonths: number | null
  status: string
}

type LoanExportCursor = { dateUsed: Date; id: string; kindRank: number }

export function encodeLoanExportCursor(cursor: LoanExportCursor) {
  return `${cursor.kindRank}|${cursor.dateUsed.toISOString()}|${cursor.id}`
}

export function decodeLoanExportCursor(
  value: string | null | undefined
): LoanExportCursor | null {
  if (!value) return null
  const [rank, date, id] = value.split("|")
  const kindRank = Number(rank)
  const dateUsed = new Date(date ?? "")

  if (
    (kindRank !== 0 && kindRank !== 1) ||
    Number.isNaN(dateUsed.getTime()) ||
    !id
  ) {
    return null
  }

  return { dateUsed, id, kindRank }
}

function toNumberOrNull(value: unknown) {
  return value == null ? null : Number(value)
}

function toLoanExportRow(row: LoanExportSqlRow): LoanExportRow {
  const recordType: LoanExportRecordType =
    Number(row.kindRank) === 0 ? "request" : "loan"
  const dateUsed = new Date(row.dateUsed)

  return {
    cursor: encodeLoanExportCursor({
      dateUsed,
      id: row.id,
      kindRank: Number(row.kindRank),
    }),
    dateUsed,
    dateUsedLabel: recordType === "loan" ? "Paid out" : "Asked for",
    estimatedMonthlyServicing: Number(row.estimatedMonthlyServicing ?? 0),
    extraMonthlySavingsAmount: Number(row.extraMonthlySavingsAmount ?? 0),
    id: row.id,
    loanTermMonths: row.loanTermMonths,
    memberName: row.memberName,
    memberNumber: row.memberNumber,
    outstandingPrincipal: toNumberOrNull(row.outstandingPrincipal),
    paidOutAt: row.paidOutAt ? new Date(row.paidOutAt) : null,
    principalAmount: toNumberOrNull(row.principalAmount),
    productCode: row.productCode,
    productName: row.productName,
    recordType,
    requestedAmount: toNumberOrNull(row.requestedAmount),
    requestedAt: new Date(row.requestedAt),
    requestedTermMonths: row.requestedTermMonths,
    status: row.status,
  }
}

/**
 * One batch of the loans export: requests not yet paid out first (by the date
 * asked for), then paid-out loans (by payout date), each oldest first.
 * `fromDate`/`toDate` are inclusive and apply to each row's own date.
 */
export async function listLoanExportBatch(
  tenantId: string,
  input: {
    cursor?: string | null
    fromDate?: Date | null
    limit: number
    toDate?: Date | null
  },
  prismaOverride?: PrismaClient
): Promise<{ nextCursor: string | null; rows: LoanExportRow[] }> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")

  const limit = Math.max(1, Math.min(Math.floor(input.limit), 5_000))
  const fromDate = input.fromDate ?? null
  const toDate = input.toDate ?? null
  const cursor = decodeLoanExportCursor(input.cursor)
  const cursorRank = cursor?.kindRank ?? null
  const cursorDate = cursor?.dateUsed ?? null
  const cursorId = cursor?.id ?? null

  const rows = (await prisma.$queryRaw`
    SELECT * FROM (
      SELECT
        0 AS "kindRank",
        r.id::text AS "id",
        r.requested_at AS "dateUsed",
        r.requested_at AS "requestedAt",
        NULL::timestamptz AS "paidOutAt",
        m.full_name AS "memberName",
        m.member_number AS "memberNumber",
        p.name AS "productName",
        p.code AS "productCode",
        r.requested_amount AS "requestedAmount",
        NULL::numeric AS "principalAmount",
        NULL::numeric AS "outstandingPrincipal",
        r.requested_term_months AS "requestedTermMonths",
        NULL::int AS "loanTermMonths",
        r.estimated_monthly_servicing AS "estimatedMonthlyServicing",
        r.extra_monthly_savings_amount AS "extraMonthlySavingsAmount",
        r.status::text AS "status"
      FROM loan_requests r
      JOIN members m ON m.id = r.member_id
      JOIN loan_products p ON p.id = r.loan_product_id
      LEFT JOIN loans l ON l.loan_request_id = r.id
      WHERE r.tenant_id = ${tenantId}::uuid
        AND (l.id IS NULL OR (l.disbursed_at IS NULL AND l.status::text = 'approved'))
        AND (${fromDate}::timestamptz IS NULL OR r.requested_at >= ${fromDate}::timestamptz)
        AND (${toDate}::timestamptz IS NULL OR r.requested_at <= ${toDate}::timestamptz)
      UNION ALL
      SELECT
        1 AS "kindRank",
        l.id::text AS "id",
        COALESCE(l.disbursed_at, r.requested_at) AS "dateUsed",
        r.requested_at AS "requestedAt",
        l.disbursed_at AS "paidOutAt",
        m.full_name AS "memberName",
        m.member_number AS "memberNumber",
        p.name AS "productName",
        p.code AS "productCode",
        NULL::numeric AS "requestedAmount",
        l.principal_amount AS "principalAmount",
        l.outstanding_principal AS "outstandingPrincipal",
        NULL::int AS "requestedTermMonths",
        l.term_months AS "loanTermMonths",
        l.estimated_monthly_servicing AS "estimatedMonthlyServicing",
        l.extra_monthly_savings_amount AS "extraMonthlySavingsAmount",
        l.status::text AS "status"
      FROM loans l
      JOIN loan_requests r ON r.id = l.loan_request_id
      JOIN members m ON m.id = l.member_id
      JOIN loan_products p ON p.id = l.loan_product_id
      WHERE l.tenant_id = ${tenantId}::uuid
        AND (l.disbursed_at IS NOT NULL OR l.status::text <> 'approved')
        AND (${fromDate}::timestamptz IS NULL
          OR COALESCE(l.disbursed_at, r.requested_at) >= ${fromDate}::timestamptz)
        AND (${toDate}::timestamptz IS NULL
          OR COALESCE(l.disbursed_at, r.requested_at) <= ${toDate}::timestamptz)
    ) export_rows
    WHERE ${cursorRank}::int IS NULL
      OR ("kindRank", "dateUsed", "id")
        > (${cursorRank}::int, ${cursorDate}::timestamptz, ${cursorId}::text)
    ORDER BY "kindRank", "dateUsed", "id"
    LIMIT ${limit}
  `) as LoanExportSqlRow[]

  const mapped = rows.map(toLoanExportRow)

  return {
    nextCursor:
      mapped.length === limit ? (mapped.at(-1)?.cursor ?? null) : null,
    rows: mapped,
  }
}
