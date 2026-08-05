import { getPublicErrorHttpStatus, toPublicError } from "@halaalvest/errors"

export function getRestErrorResponse(error: unknown) {
  return {
    body: {
      error: toPublicError(error),
    },
    status: getPublicErrorHttpStatus(error),
  }
}
