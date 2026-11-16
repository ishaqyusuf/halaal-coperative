import { readErrorCode, readHttpStatus } from "@/lib/app-query-policy"
import { RequestTimeoutError } from "@/lib/request-timeout"

/**
 * What a failed sign-in or recovery request means to the member. The API's
 * error contract rewrites every UNAUTHORIZED to a generic "sign in again"
 * message, so these screens map transport codes to their own copy. Wrong
 * passwords and unknown numbers share one message (no user enumeration).
 */
export type AuthErrorKind =
  | "invalid"
  | "rate-limited"
  | "inactive"
  | "offline"
  | "timeout"
  | "code"
  | "unknown"

export type AuthErrorPresentation = {
  kind: AuthErrorKind
  message: string
  /** Show a Retry action (connection problems only). */
  retryable: boolean
}

export const AUTH_MESSAGES = {
  inactive: "This account is not active for the selected cooperative.",
  invalid: "The cooperative number or account details were invalid.",
  invalidCode: "This code is invalid or no longer available.",
  offline: "You're offline. Check your connection and try again.",
  rateLimited: "Too many attempts. Wait a few minutes before trying again.",
  timeout: "This is taking too long. Check your connection and try again.",
  unknownRecovery: "Recovery could not be completed. Try again.",
  unknownSignIn: "Sign-in could not be completed. Try again.",
} as const

const NETWORK_FAILURE = /network request failed|failed to fetch|network error|load failed|could not connect/i

function readMessage(error: unknown) {
  return error instanceof Error ? error.message : ""
}

/** fetch() never reached the server (no tRPC data on the error). */
export function isAuthNetworkFailure(error: unknown) {
  if (!error || typeof error !== "object") return false
  if (readErrorCode(error) || readHttpStatus(error)) return false
  const cause = (error as { cause?: unknown }).cause
  return (
    NETWORK_FAILURE.test(readMessage(error)) ||
    NETWORK_FAILURE.test(readMessage(cause))
  )
}

function connectionProblem(
  error: unknown,
  offline: boolean
): AuthErrorPresentation | null {
  if (error instanceof RequestTimeoutError)
    return { kind: "timeout", message: AUTH_MESSAGES.timeout, retryable: true }
  if (offline || isAuthNetworkFailure(error))
    return { kind: "offline", message: AUTH_MESSAGES.offline, retryable: true }
  return null
}

function isRateLimited(error: unknown) {
  return (
    readErrorCode(error) === "TOO_MANY_REQUESTS" ||
    readHttpStatus(error) === 429 ||
    /too many/i.test(readMessage(error))
  )
}

export function getSignInErrorPresentation(
  error: unknown,
  { offline = false }: { offline?: boolean } = {}
): AuthErrorPresentation {
  const connection = connectionProblem(error, offline)
  if (connection) return connection
  if (isRateLimited(error))
    return {
      kind: "rate-limited",
      message: AUTH_MESSAGES.rateLimited,
      retryable: false,
    }
  const code = readErrorCode(error)
  if (code === "UNAUTHORIZED" || code === "BAD_REQUEST")
    return { kind: "invalid", message: AUTH_MESSAGES.invalid, retryable: false }
  if (code === "FORBIDDEN" || code === "PRECONDITION_FAILED")
    return {
      kind: "inactive",
      message: AUTH_MESSAGES.inactive,
      retryable: false,
    }
  return {
    kind: "unknown",
    message: AUTH_MESSAGES.unknownSignIn,
    retryable: true,
  }
}

/** Requesting a code always answers neutrally; only limits and connection fail. */
export function getRecoveryRequestErrorPresentation(
  error: unknown,
  { offline = false }: { offline?: boolean } = {}
): AuthErrorPresentation {
  const connection = connectionProblem(error, offline)
  if (connection) return connection
  if (isRateLimited(error))
    return {
      kind: "rate-limited",
      message: AUTH_MESSAGES.rateLimited,
      retryable: false,
    }
  return {
    kind: "unknown",
    message: AUTH_MESSAGES.unknownRecovery,
    retryable: true,
  }
}

/**
 * The code is only checked when the new password is submitted, so a
 * "code" result sends the member back to the code step.
 */
export function getRecoveryCompleteErrorPresentation(
  error: unknown,
  { offline = false }: { offline?: boolean } = {}
): AuthErrorPresentation {
  const connection = connectionProblem(error, offline)
  if (connection) return connection
  if (isRateLimited(error))
    return {
      kind: "rate-limited",
      message: AUTH_MESSAGES.rateLimited,
      retryable: false,
    }
  const code = readErrorCode(error)
  const message = readMessage(error)
  // The server answers both a bad code and an inactive account with
  // PRECONDITION_FAILED; its public message tells them apart.
  if (/invalid or no longer available/i.test(message))
    return {
      kind: "code",
      message: AUTH_MESSAGES.invalidCode,
      retryable: false,
    }
  if (code === "FORBIDDEN" || /not active/i.test(message))
    return {
      kind: "inactive",
      message: AUTH_MESSAGES.inactive,
      retryable: false,
    }
  const status = readHttpStatus(error)
  if (
    code === "BAD_REQUEST" ||
    code === "PRECONDITION_FAILED" ||
    code === "NOT_FOUND" ||
    code === "CONFLICT" ||
    code === "UNAUTHORIZED" ||
    (status !== null && status >= 400 && status < 500)
  )
    return {
      kind: "code",
      message: AUTH_MESSAGES.invalidCode,
      retryable: false,
    }
  return {
    kind: "unknown",
    message: AUTH_MESSAGES.unknownRecovery,
    retryable: true,
  }
}
