import type { PrismaClient } from "../../generated/prisma/client"

/**
 * Figures for /reports and /analytics, each summed in one SQL statement
 * instead of loading rows and adding them up in JavaScript.
 *
 * Late loan payments use the read-time rule from repayments
 * (`lateScheduleItemWhere`): an unpaid instalment whose due date is before
 * today, on a loan that is still being repaid.
 */

type Numeric = { toString(): string } | number | string | bigint | null

function toNumber(value: Numeric | undefined) {
  if (value === null || value === undefined) return 0
  const parsed = Number(value.toString())
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0
}

function startOfUtcDay(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
}

export type MoneyMovement = {
  /** Loan repayments recorded. */
  loanRepayments: number
  /** Loans paid out to members. */
  loansPaidOut: number
  /** Savings payments recorded. */
  savingsPaidIn: number
}

/** Money that moved between two dates (either end may be open). */
export async function getMoneyMovement(
  prisma: PrismaClient,
  input: { fromDate?: Date; tenantId: string; toDate?: Date }
): Promise<MoneyMovement> {
  const from = input.fromDate ?? null
  const to = input.toDate ?? null
  const [row] = await prisma.$queryRaw<
    Array<{ loans_paid_out: Numeric; repaid: Numeric; savings_in: Numeric }>
  >`
    SELECT
      (
        SELECT COALESCE(SUM(c.amount), 0)
        FROM contributions c
        WHERE c.tenant_id = ${input.tenantId}::uuid
          AND c.status = 'posted'
          AND (${from}::timestamptz IS NULL OR c.posted_at >= ${from}::timestamptz)
          AND (${to}::timestamptz IS NULL OR c.posted_at <= ${to}::timestamptz)
      ) AS savings_in,
      (
        SELECT COALESCE(SUM(l.principal_amount), 0)
        FROM loans l
        WHERE l.tenant_id = ${input.tenantId}::uuid
          AND l.disbursed_at IS NOT NULL
          AND (${from}::timestamptz IS NULL OR l.disbursed_at >= ${from}::timestamptz)
          AND (${to}::timestamptz IS NULL OR l.disbursed_at <= ${to}::timestamptz)
      ) AS loans_paid_out,
      (
        SELECT COALESCE(SUM(r.amount), 0)
        FROM repayments r
        WHERE r.tenant_id = ${input.tenantId}::uuid
          AND r.status = 'posted'
          AND (${from}::timestamptz IS NULL OR r.paid_at >= ${from}::timestamptz)
          AND (${to}::timestamptz IS NULL OR r.paid_at <= ${to}::timestamptz)
      ) AS repaid
  `

  return {
    loanRepayments: toNumber(row?.repaid),
    loansPaidOut: toNumber(row?.loans_paid_out),
    savingsPaidIn: toNumber(row?.savings_in),
  }
}

export type LateLoanPayments = {
  /** Unpaid amount of every late instalment. */
  amount: number
  loanCount: number
  /** Part of `amount` that is at least 30, 60 and 90 days late. */
  over30Days: number
  over60Days: number
  over90Days: number
}

export async function getLateLoanPayments(
  prisma: PrismaClient,
  input: { asOf?: Date; tenantId: string }
): Promise<LateLoanPayments> {
  const asOf = input.asOf ?? startOfUtcDay()
  const [row] = await prisma.$queryRaw<
    Array<{
      amount: Numeric
      loan_count: Numeric
      over_30: Numeric
      over_60: Numeric
      over_90: Numeric
    }>
  >`
    SELECT
      COALESCE(SUM(GREATEST(s.total_due - s.amount_paid, 0)), 0) AS amount,
      COUNT(DISTINCT s.loan_id) AS loan_count,
      COALESCE(SUM(GREATEST(s.total_due - s.amount_paid, 0))
        FILTER (WHERE s.due_at <= ${asOf}::timestamptz - interval '30 days'), 0) AS over_30,
      COALESCE(SUM(GREATEST(s.total_due - s.amount_paid, 0))
        FILTER (WHERE s.due_at <= ${asOf}::timestamptz - interval '60 days'), 0) AS over_60,
      COALESCE(SUM(GREATEST(s.total_due - s.amount_paid, 0))
        FILTER (WHERE s.due_at <= ${asOf}::timestamptz - interval '90 days'), 0) AS over_90
    FROM repayment_schedule_items s
    JOIN loans l ON l.id = s.loan_id
    WHERE s.tenant_id = ${input.tenantId}::uuid
      AND l.status IN ('disbursed', 'active')
      AND s.status IN ('pending', 'due', 'partially_paid', 'overdue')
      AND s.due_at < ${asOf}::timestamptz
  `

  return {
    amount: toNumber(row?.amount),
    loanCount: toNumber(row?.loan_count),
    over30Days: toNumber(row?.over_30),
    over60Days: toNumber(row?.over_60),
    over90Days: toNumber(row?.over_90),
  }
}

export type ReportAttentionCounts = {
  documentsToReview: number
  emailsFailed: number
  hasFoodPurchase: boolean
  hasPaymentReceipts: boolean
  hasProcurement: boolean
  hasSupportCases: boolean
  idChecksToReview: number
  importsFailed: number
  lateCasesOpen: number
}

/** Things staff should look at, plus which optional services have records. */
export async function getReportAttentionCounts(
  prisma: PrismaClient,
  input: { fromDate?: Date; tenantId: string; toDate?: Date }
): Promise<ReportAttentionCounts> {
  const from = input.fromDate ?? null
  const to = input.toDate ?? null
  const tenantId = input.tenantId
  const [row] = await prisma.$queryRaw<
    Array<{
      documents: Numeric
      emails_failed: Numeric
      has_food: boolean
      has_procurement: boolean
      has_receipts: boolean
      has_support: boolean
      id_checks: Numeric
      imports_failed: Numeric
      late_cases: Numeric
    }>
  >`
    SELECT
      (
        SELECT COUNT(*) FROM audit_logs a
        WHERE a.tenant_id = ${tenantId}::uuid
          AND a.action = 'notification.email_failed'
          AND (${from}::timestamptz IS NULL OR a.occurred_at >= ${from}::timestamptz)
          AND (${to}::timestamptz IS NULL OR a.occurred_at <= ${to}::timestamptz)
      ) AS emails_failed,
      (
        SELECT COUNT(*) FROM import_batches b
        WHERE b.tenant_id = ${tenantId}::uuid
          AND b.status = 'failed'
          AND (${from}::timestamptz IS NULL OR b.created_at >= ${from}::timestamptz)
          AND (${to}::timestamptz IS NULL OR b.created_at <= ${to}::timestamptz)
      ) AS imports_failed,
      (
        SELECT COUNT(*) FROM collection_follow_ups f
        WHERE f.tenant_id = ${tenantId}::uuid AND f.resolution_status = 'open'
      ) AS late_cases,
      (
        SELECT COUNT(*) FROM members m
        WHERE m.tenant_id = ${tenantId}::uuid
          AND m.status = 'active'
          AND m.kyc_status = 'pending'
      ) AS id_checks,
      (
        SELECT COUNT(*) FROM member_documents d
        WHERE d.tenant_id = ${tenantId}::uuid AND d.review_status = 'pending'
      ) AS documents,
      EXISTS (SELECT 1 FROM procurement_requests p WHERE p.tenant_id = ${tenantId}::uuid) AS has_procurement,
      EXISTS (SELECT 1 FROM food_purchase_applications fp WHERE fp.tenant_id = ${tenantId}::uuid) AS has_food,
      EXISTS (SELECT 1 FROM support_cases sc WHERE sc.tenant_id = ${tenantId}::uuid) AS has_support,
      EXISTS (SELECT 1 FROM member_payment_receipts pr WHERE pr.tenant_id = ${tenantId}::uuid) AS has_receipts
  `

  return {
    documentsToReview: toNumber(row?.documents),
    emailsFailed: toNumber(row?.emails_failed),
    hasFoodPurchase: Boolean(row?.has_food),
    hasPaymentReceipts: Boolean(row?.has_receipts),
    hasProcurement: Boolean(row?.has_procurement),
    hasSupportCases: Boolean(row?.has_support),
    idChecksToReview: toNumber(row?.id_checks),
    importsFailed: toNumber(row?.imports_failed),
    lateCasesOpen: toNumber(row?.late_cases),
  }
}

export type MonthlyTrendRow = {
  /** "2026-11" */
  key: string
  /** Due from members that month: the monthly record's rows, else (this month only) active savings plans. */
  expected: number
  /** Paid by members that month: the monthly record's rows, else posted savings. */
  received: number
  loansPaidOut: number
  loanRepayments: number
}

/**
 * One row per calendar month (UTC) from `start` up to, not including,
 * `endExclusive`. `currentMonthStart` marks the month whose expected amount
 * falls back to active savings plans when it has no monthly record yet.
 */
export async function getMonthlyTrend(
  prisma: PrismaClient,
  input: {
    currentMonthStart: Date
    endExclusive: Date
    start: Date
    tenantId: string
  }
): Promise<MonthlyTrendRow[]> {
  const { currentMonthStart, endExclusive, start, tenantId } = input
  const rows = await prisma.$queryRaw<
    Array<{
      key: string
      paid_out: Numeric
      planned: Numeric
      posted: Numeric
      record_expected: Numeric
      record_paid: Numeric
      repaid: Numeric
    }>
  >`
    WITH months AS (
      SELECT generate_series(
        ${start}::timestamptz AT TIME ZONE 'UTC',
        (${endExclusive}::timestamptz AT TIME ZONE 'UTC') - interval '1 month',
        interval '1 month'
      ) AS month_start
    ),
    records AS (
      SELECT
        make_timestamp(r.period_year, r.period_month, 1, 0, 0, 0) AS month_start,
        SUM(rm.calculated_payable_amount) AS expected,
        SUM(rm.total_paid_amount) AS paid
      FROM monthly_records r
      JOIN monthly_record_members rm ON rm.monthly_record_id = r.id
      WHERE r.tenant_id = ${tenantId}::uuid
        AND make_timestamp(r.period_year, r.period_month, 1, 0, 0, 0)
          >= ${start}::timestamptz AT TIME ZONE 'UTC'
        AND make_timestamp(r.period_year, r.period_month, 1, 0, 0, 0)
          < ${endExclusive}::timestamptz AT TIME ZONE 'UTC'
      GROUP BY 1
    ),
    posted AS (
      SELECT date_trunc('month', c.posted_at AT TIME ZONE 'UTC') AS month_start,
        SUM(c.amount) AS total
      FROM contributions c
      WHERE c.tenant_id = ${tenantId}::uuid
        AND c.status = 'posted'
        AND c.posted_at >= ${start}::timestamptz
        AND c.posted_at < ${endExclusive}::timestamptz
      GROUP BY 1
    ),
    paid_out AS (
      SELECT date_trunc('month', l.disbursed_at AT TIME ZONE 'UTC') AS month_start,
        SUM(l.principal_amount) AS total
      FROM loans l
      WHERE l.tenant_id = ${tenantId}::uuid
        AND l.disbursed_at >= ${start}::timestamptz
        AND l.disbursed_at < ${endExclusive}::timestamptz
      GROUP BY 1
    ),
    repaid AS (
      SELECT date_trunc('month', p.paid_at AT TIME ZONE 'UTC') AS month_start,
        SUM(p.amount) AS total
      FROM repayments p
      WHERE p.tenant_id = ${tenantId}::uuid
        AND p.status = 'posted'
        AND p.paid_at >= ${start}::timestamptz
        AND p.paid_at < ${endExclusive}::timestamptz
      GROUP BY 1
    ),
    planned AS (
      SELECT COALESCE(SUM(cp.amount), 0) AS total
      FROM contribution_plans cp
      JOIN members m ON m.id = cp.member_id
      WHERE cp.tenant_id = ${tenantId}::uuid
        AND cp.is_active
        AND m.status = 'active'
        AND cp.starts_at < ${currentMonthStart}::timestamptz + interval '1 month'
        AND (cp.ends_at IS NULL OR cp.ends_at >= ${currentMonthStart}::timestamptz)
    )
    SELECT
      to_char(months.month_start, 'YYYY-MM') AS key,
      records.expected AS record_expected,
      records.paid AS record_paid,
      posted.total AS posted,
      CASE
        WHEN months.month_start = ${currentMonthStart}::timestamptz AT TIME ZONE 'UTC'
        THEN (SELECT total FROM planned)
        ELSE NULL
      END AS planned,
      paid_out.total AS paid_out,
      repaid.total AS repaid
    FROM months
    LEFT JOIN records ON records.month_start = months.month_start
    LEFT JOIN posted ON posted.month_start = months.month_start
    LEFT JOIN paid_out ON paid_out.month_start = months.month_start
    LEFT JOIN repaid ON repaid.month_start = months.month_start
    ORDER BY months.month_start
  `

  return rows.map((row) => {
    const hasRecord = row.record_expected !== null
    return {
      expected: hasRecord
        ? toNumber(row.record_expected)
        : toNumber(row.planned),
      key: row.key,
      loanRepayments: toNumber(row.repaid),
      loansPaidOut: toNumber(row.paid_out),
      received: hasRecord ? toNumber(row.record_paid) : toNumber(row.posted),
    }
  })
}

export type MemberAndShareCounts = {
  activeBusinesses: number
  activeMembers: number
  documentsToReview: number
  idChecksToReview: number
  profitNotShared: number
  shareCapital: number
  waitingToJoin: number
}

export async function getMemberAndShareCounts(
  prisma: PrismaClient,
  input: { tenantId: string }
): Promise<MemberAndShareCounts> {
  const tenantId = input.tenantId
  const [row] = await prisma.$queryRaw<
    Array<{
      active_businesses: Numeric
      active_members: Numeric
      documents: Numeric
      id_checks: Numeric
      profit_allocations: Numeric
      profit_entries: Numeric
      share_capital: Numeric
      waiting_to_join: Numeric
    }>
  >`
    SELECT
      (SELECT COUNT(*) FROM members m
        WHERE m.tenant_id = ${tenantId}::uuid AND m.status = 'active') AS active_members,
      (SELECT COUNT(*) FROM member_onboarding_requests o
        WHERE o.tenant_id = ${tenantId}::uuid AND o.status = 'pending_approval') AS waiting_to_join,
      (SELECT COUNT(*) FROM members m
        WHERE m.tenant_id = ${tenantId}::uuid AND m.status = 'active'
          AND m.kyc_status = 'pending') AS id_checks,
      (SELECT COUNT(*) FROM member_documents d
        WHERE d.tenant_id = ${tenantId}::uuid AND d.review_status = 'pending') AS documents,
      (SELECT COALESCE(SUM(e.amount), 0) FROM member_share_ledger_entries e
        WHERE e.tenant_id = ${tenantId}::uuid) AS share_capital,
      (SELECT COUNT(*) FROM share_businesses b
        WHERE b.tenant_id = ${tenantId}::uuid AND b.status = 'active') AS active_businesses,
      (SELECT COALESCE(SUM(p.allocatable_profit_amount), 0) FROM share_business_profit_entries p
        WHERE p.tenant_id = ${tenantId}::uuid AND p.status IN ('draft', 'reviewed')) AS profit_entries,
      (SELECT COALESCE(SUM(a.allocated_profit_amount), 0) FROM share_profit_allocations a
        WHERE a.tenant_id = ${tenantId}::uuid AND a.status = 'draft') AS profit_allocations
  `

  return {
    activeBusinesses: toNumber(row?.active_businesses),
    activeMembers: toNumber(row?.active_members),
    documentsToReview: toNumber(row?.documents),
    idChecksToReview: toNumber(row?.id_checks),
    profitNotShared:
      toNumber(row?.profit_entries) + toNumber(row?.profit_allocations),
    shareCapital: toNumber(row?.share_capital),
    waitingToJoin: toNumber(row?.waiting_to_join),
  }
}
