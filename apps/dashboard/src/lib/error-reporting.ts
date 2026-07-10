const DEFAULT_SOURCE = "dashboard.error_boundary"
const MAX_DIGEST_LENGTH = 160
const MAX_MESSAGE_LENGTH = 320
const MAX_STACK_LENGTH = 1800
const MAX_PATH_LENGTH = 240
const MAX_SOURCE_LENGTH = 80
const MAX_USER_AGENT_LENGTH = 240

export type DashboardErrorReport = {
  componentStack: string | null
  digest: string | null
  message: string | null
  path: string | null
  source: string
  stack: string | null
  userAgent: string | null
}

type ErrorReportRequestMeta = {
  userAgent?: string | null
}

function toRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {}
  }

  return input as Record<string, unknown>
}

function stringify(value: unknown) {
  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  return null
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  if (maxLength <= 3) {
    return value.slice(0, maxLength)
  }

  return `${value.slice(0, maxLength - 3)}...`
}

function redactSecrets(value: string) {
  return value
    .replace(
      /\b(authorization)\s*[:=]\s*(?:Bearer\s+)?[^\n\r]+/gi,
      "$1=[redacted]",
    )
    .replace(
      /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
      "Bearer [redacted]",
    )
    .replace(
      /\b(password|secret|token|api[_-]?key|dsn)\s*[:=]\s*["']?[^"'\s&]+/gi,
      "$1=[redacted]",
    )
    .replace(
      /([?&](?:password|secret|token|api[_-]?key|authorization|dsn)=)[^&\s]+/gi,
      "$1[redacted]",
    )
}

function cleanString(value: unknown, maxLength: number) {
  const text = stringify(value)

  if (!text) {
    return null
  }

  const cleaned = redactSecrets(text.replace(/\0/g, "").trim())

  return cleaned ? truncate(cleaned, maxLength) : null
}

function cleanPath(value: unknown) {
  const text = cleanString(value, MAX_PATH_LENGTH)

  if (!text) {
    return null
  }

  try {
    const url = new URL(text, "https://dashboard.local")

    return truncate(url.pathname, MAX_PATH_LENGTH)
  } catch {
    return truncate(text.split("?")[0]?.split("#")[0] ?? text, MAX_PATH_LENGTH)
  }
}

export function sanitizeDashboardErrorReport(
  input: unknown,
  requestMeta: ErrorReportRequestMeta = {},
): DashboardErrorReport {
  const record = toRecord(input)
  const source =
    cleanString(record.source, MAX_SOURCE_LENGTH) ?? DEFAULT_SOURCE

  return {
    componentStack: cleanString(record.componentStack, MAX_STACK_LENGTH),
    digest: cleanString(record.digest, MAX_DIGEST_LENGTH),
    message: cleanString(record.message, MAX_MESSAGE_LENGTH),
    path: cleanPath(record.path),
    source,
    stack: cleanString(record.stack, MAX_STACK_LENGTH),
    userAgent: cleanString(requestMeta.userAgent, MAX_USER_AGENT_LENGTH),
  }
}

export function hasDashboardErrorReportDetails(report: DashboardErrorReport) {
  return Boolean(
    report.digest || report.message || report.stack || report.componentStack,
  )
}
