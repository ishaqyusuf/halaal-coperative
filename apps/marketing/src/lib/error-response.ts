import {
  getPublicError,
  getPublicErrorHttpStatus,
  toPublicError,
  type PublicError,
} from "@halaalvest/errors"

export function getMarketingErrorResponse(
  error: unknown,
  options: { status?: number } = {}
) {
  const appError = toPublicError(error)

  return {
    body: {
      error: appError,
    },
    status: options.status ?? getPublicErrorHttpStatus(error),
  }
}

export function getMarketingErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback
  const error = (payload as { error?: unknown }).error
  if (!error || typeof error !== "object") return fallback
  return getPublicError(error).message
}

export type MarketingErrorEnvelope = { error: PublicError }
