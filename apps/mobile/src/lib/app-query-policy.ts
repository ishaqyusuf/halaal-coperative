/**
 * The mobile read policy (ADR-20261116 §5). Pure so it is unit-testable;
 * hooks/use-app-query.ts applies it to React Query.
 */

/** Fresh enough to skip a refetch on quick tab switches. */
export const APP_QUERY_STALE_TIME = 30_000
/** Keep cached screens for back-navigation without refetch flashes. */
export const APP_QUERY_GC_TIME = 10 * 60_000
export const APP_QUERY_MAX_RETRIES = 2
export const APP_PAGE_SIZE_DEFAULT = 20
export const APP_PAGE_SIZE_MAX = 50

/** tRPC codes that a retry cannot fix: auth, permission, validation, absence. */
const UNRECOVERABLE_CODES = new Set([
  "BAD_REQUEST",
  "CONFLICT",
  "FORBIDDEN",
  "METHOD_NOT_SUPPORTED",
  "NOT_FOUND",
  "PARSE_ERROR",
  "PAYLOAD_TOO_LARGE",
  "PRECONDITION_FAILED",
  "UNAUTHORIZED",
  "UNPROCESSABLE_CONTENT",
])

const UNRECOVERABLE_NAMES = new Set([
  "MobileOfflineOperationError",
  "ZodError",
])

type ErrorLike = {
  code?: unknown
  data?: { code?: unknown; httpStatus?: unknown } | null
  name?: unknown
  shape?: { data?: { code?: unknown; httpStatus?: unknown } | null } | null
  status?: unknown
}

export function readErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null
  const value = error as ErrorLike
  const code = value.data?.code ?? value.shape?.data?.code ?? value.code
  return typeof code === "string" ? code : null
}

export function readHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null
  const value = error as ErrorLike
  const status =
    value.data?.httpStatus ?? value.shape?.data?.httpStatus ?? value.status
  return typeof status === "number" ? status : null
}

/** True for failures a retry cannot fix (auth, permission, validation). */
export function isUnrecoverableQueryError(error: unknown) {
  const code = readErrorCode(error)
  if (code && UNRECOVERABLE_CODES.has(code)) return true
  const status = readHttpStatus(error)
  if (status !== null && status >= 400 && status < 500 && status !== 408 && status !== 429)
    return true
  const name =
    error && typeof error === "object" ? (error as ErrorLike).name : undefined
  return typeof name === "string" && UNRECOVERABLE_NAMES.has(name)
}

/** React Query `retry`: transient failures only, at most twice. */
export function shouldRetryAppQuery(failureCount: number, error: unknown) {
  if (isUnrecoverableQueryError(error)) return false
  return failureCount < APP_QUERY_MAX_RETRIES
}

/** 1s, 2s, then capped at 8s. */
export function appQueryRetryDelay(attempt: number) {
  return Math.min(1_000 * 2 ** Math.max(0, attempt), 8_000)
}

/** Bounded page sizes: never ask the server for more than 50 rows. */
export function clampPageSize(requested?: number | null) {
  if (!requested || !Number.isFinite(requested)) return APP_PAGE_SIZE_DEFAULT
  return Math.min(APP_PAGE_SIZE_MAX, Math.max(1, Math.floor(requested)))
}
