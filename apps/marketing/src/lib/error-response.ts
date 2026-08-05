import { getPublicErrorHttpStatus, toPublicError } from "@halaalvest/errors"

export function getMarketingErrorResponse(error: unknown) {
  const appError = toPublicError(error)

  return {
    body: {
      appError,
      error: appError.message,
    },
    status: getPublicErrorHttpStatus(error),
  }
}
