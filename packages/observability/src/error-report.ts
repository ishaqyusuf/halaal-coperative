import { AppError, classifyError } from "@halaalvest/errors"

export type ErrorMetadataValue = boolean | number | string | null | undefined
export type ErrorReportContext = {
  extra?: Record<string, ErrorMetadataValue>
  operation?: string
  requestId?: string
  runtime: "api" | "dashboard" | "jobs" | "marketing" | "mobile"
  source: string
  tags?: Record<string, ErrorMetadataValue>
}
export type ErrorCaptureContext = {
  extra: Record<string, boolean | number | string | null>
  fingerprint: string[]
  level: "error" | "fatal" | "info" | "warning"
  tags: Record<string, string>
}

const SENSITIVE_KEY_PATTERN =
  /(?:address|authorization|balance|bank|body|charge|contribution|cookie|cooperative|customer|deduction|document|email|employer|financ|guarantor|header|identity|input|ledger|loan|media|member|message|password|payload|payment|payroll|phone|query|recipient|repayment|request|secret|statement|tenant|token|transcript|url|user)/i

function allowed(key: string) {
  return !SENSITIVE_KEY_PATTERN.test(key)
}
function bounded(value: ErrorMetadataValue) {
  if (value === undefined) return undefined
  return typeof value === "string" ? value.slice(0, 200) : value
}
function extras(input?: Record<string, ErrorMetadataValue>) {
  const output: Record<string, boolean | number | string | null> = {}
  for (const [key, raw] of Object.entries(input ?? {})) {
    if (!allowed(key)) continue
    const value = bounded(raw)
    if (value !== undefined) output[key] = value
  }
  return output
}
function tags(input?: Record<string, ErrorMetadataValue>) {
  const output: Record<string, string> = {}
  for (const [key, raw] of Object.entries(input ?? {})) {
    if (!allowed(key)) continue
    const value = bounded(raw)
    if (value !== undefined && value !== null) output[key] = String(value)
  }
  return output
}

export function getReportableError(error: unknown) {
  if (error instanceof AppError && error.cause instanceof Error)
    return error.cause
  return error instanceof Error ? error : new Error(String(error))
}
export function shouldReportError(error: unknown) {
  return classifyError(error).reportable
}
export function buildErrorReport(error: unknown, context: ErrorReportContext) {
  const classified = classifyError(error, { operation: context.operation })
  const operation = classified.operation ?? context.operation
  return {
    captureContext: {
      extra: extras(context.extra),
      fingerprint: [classified.code, operation ?? "unknown"],
      level: classified.severity,
      tags: {
        ...tags(context.tags),
        error_category: classified.category,
        error_code: classified.code,
        error_reference: classified.referenceId,
        ...(operation ? { operation } : {}),
        ...(context.requestId ? { request_id: context.requestId } : {}),
        retryable: String(classified.retryable),
        runtime: context.runtime,
        source: context.source,
      },
    } satisfies ErrorCaptureContext,
    classified,
    reportableError: getReportableError(classified),
  }
}
