import { AppError } from "./app-error"
import { ERROR_DESCRIPTORS } from "./descriptors"
import type { ErrorClassificationOptions, ErrorCode } from "./types"

const TRPC_CODE_MAP: Partial<Record<string, ErrorCode>> = {
  BAD_REQUEST: "VALIDATION_FAILED",
  CONFLICT: "CONFLICT",
  FORBIDDEN: "PERMISSION_DENIED",
  NOT_FOUND: "NOT_FOUND",
  PRECONDITION_FAILED: "CONFLICT",
  TOO_MANY_REQUESTS: "RATE_LIMITED",
  UNAUTHORIZED: "AUTHENTICATION_REQUIRED",
}
const PRISMA_CODE_MAP: Partial<Record<string, ErrorCode>> = {
  P2002: "CONFLICT",
  P2003: "DATABASE_CONSTRAINT",
  P2024: "DATABASE_POOL_TIMEOUT",
  P2028: "DATABASE_TRANSACTION_TIMEOUT",
  P2034: "DATABASE_WRITE_CONFLICT",
}
const HTTP_STATUS_MAP: Partial<Record<number, ErrorCode>> = {
  400: "VALIDATION_FAILED",
  401: "AUTHENTICATION_REQUIRED",
  403: "PERMISSION_DENIED",
  404: "NOT_FOUND",
  409: "CONFLICT",
  412: "CONFLICT",
  422: "VALIDATION_FAILED",
  429: "RATE_LIMITED",
}
const TECHNICAL_MESSAGE_PATTERN =
  /(?:\bprisma\b|\bp\d{4}\b|transaction (?:api|already closed|expired|timed out)|unique constraint|foreign key constraint|\bsql\b|database|connection pool|stack trace|cannot read propert|is not a function|\bat\s+[\w$.]+\s*\(|econn(?:reset|refused)|enotfound)/i

type ErrorRecord = Record<string, unknown> & {
  cause?: unknown
  code?: unknown
  issues?: unknown
  message?: unknown
  name?: unknown
  status?: unknown
  statusCode?: unknown
}

function asRecord(error: unknown): ErrorRecord | null {
  return typeof error === "object" && error !== null
    ? (error as ErrorRecord)
    : null
}
function messageOf(error: unknown) {
  if (error instanceof Error) return error.message
  const value = asRecord(error)?.message
  return typeof value === "string" ? value : undefined
}
function codeOf(error: unknown) {
  const value = asRecord(error)?.code
  return typeof value === "string" ? value : undefined
}
function statusOf(error: unknown) {
  const record = asRecord(error)
  const value = record?.status ?? record?.statusCode
  return typeof value === "number" ? value : undefined
}
function classified(
  code: ErrorCode,
  error: unknown,
  options: ErrorClassificationOptions,
  reportable?: boolean
) {
  return new AppError({
    cause: error,
    code,
    internalMessage: messageOf(error),
    operation: options.operation,
    publicMessage:
      options.publicMessage ?? ERROR_DESCRIPTORS[code].publicMessage,
    referenceId: options.referenceId,
    reportable,
  })
}

export function classifyError(
  error: unknown,
  options: ErrorClassificationOptions = {}
): AppError {
  if (error instanceof AppError) return error

  const record = asRecord(error)
  const cause = record?.cause
  if (cause instanceof AppError) return cause
  if (cause && cause !== error) {
    const nested: AppError = classifyError(cause, options)
    if (nested.code !== "UNEXPECTED") return nested
  }

  if (record?.name === "ZodError" || Array.isArray(record?.issues)) {
    return classified("VALIDATION_FAILED", error, options)
  }

  const code = codeOf(error)
  const prismaLike =
    Boolean(code?.startsWith("P")) ||
    (typeof record?.name === "string" && record.name.startsWith("PrismaClient"))
  if (prismaLike) {
    return classified(
      PRISMA_CODE_MAP[code ?? ""] ?? "UNEXPECTED",
      error,
      options
    )
  }

  const trpcLike =
    record?.name === "TRPCError" || Boolean(TRPC_CODE_MAP[code ?? ""])
  if (trpcLike) {
    const mapped = TRPC_CODE_MAP[code ?? ""] ?? "UNEXPECTED"
    const message = messageOf(error)?.trim()
    const reportable =
      message && message !== code && TECHNICAL_MESSAGE_PATTERN.test(message)
        ? true
        : undefined
    return classified(mapped, error, options, reportable)
  }

  const status = statusOf(error)
  if (status)
    return classified(HTTP_STATUS_MAP[status] ?? "UNEXPECTED", error, options)

  const message = messageOf(error)?.toLowerCase() ?? ""
  if (
    [
      "econnreset",
      "econnrefused",
      "enotfound",
      "network request failed",
      "failed to fetch",
    ].some((part) => message.includes(part))
  ) {
    return classified("NETWORK_UNAVAILABLE", error, options)
  }
  return classified("UNEXPECTED", error, options)
}
