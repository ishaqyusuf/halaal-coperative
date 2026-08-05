import {
  ERROR_DESCRIPTORS,
  type ErrorCategory,
  type ErrorCode,
} from "@halaalvest/errors"

const ALLOWED_SOURCES = [
  "dashboard.business_error_boundary",
  "dashboard.error_boundary",
  "dashboard.global_error",
  "dashboard.home_error_boundary",
  "dashboard.member_backfill_error_boundary",
  "dashboard.member_statement_error_boundary",
  "dashboard.mutation",
  "dashboard.query",
  "dashboard.reports_error_boundary",
] as const
const ALLOWED_SOURCE_SET = new Set<string>(ALLOWED_SOURCES)
const ERROR_REFERENCE_PATTERN = /^ERR-[A-Z0-9_-]{6,64}$/

export type DashboardErrorSource = (typeof ALLOWED_SOURCES)[number]

export type DashboardErrorReport = {
  category: ErrorCategory | null
  code: ErrorCode | null
  referenceId: string | null
  retryable: boolean | null
  source: string | null
}

function toRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {}
  }

  return input as Record<string, unknown>
}

function getErrorCode(value: unknown): ErrorCode | null {
  return typeof value === "string" && value in ERROR_DESCRIPTORS
    ? (value as ErrorCode)
    : null
}

function getReferenceId(value: unknown) {
  return typeof value === "string" && ERROR_REFERENCE_PATTERN.test(value)
    ? value
    : null
}

function getSource(value: unknown) {
  return typeof value === "string" && ALLOWED_SOURCE_SET.has(value)
    ? value
    : null
}

export function sanitizeDashboardErrorReport(
  input: unknown
): DashboardErrorReport {
  const record = toRecord(input)
  const code = getErrorCode(record.code)
  const descriptor = code ? ERROR_DESCRIPTORS[code] : null

  return {
    category: descriptor?.category ?? null,
    code,
    referenceId: getReferenceId(record.referenceId),
    retryable: descriptor?.retryable ?? null,
    source: getSource(record.source),
  }
}

export function hasDashboardErrorReportDetails(report: DashboardErrorReport) {
  return Boolean(report.code && report.referenceId && report.source)
}

export function canRecordDashboardErrorReceipt(input: {
  hasMembership: boolean
  hasSession: boolean
  hasTenant: boolean
  hasUser: boolean
}) {
  return (
    input.hasMembership && input.hasSession && input.hasTenant && input.hasUser
  )
}
