import { TRPCError } from "@trpc/server"
import { getHTTPStatusCodeFromError } from "@trpc/server/http"

export type QaAccessErrorResponse = {
  body: { error: string; message: string }
  status: number
}

// Fixed, safe copy per outcome. Internal reasons (unknown QA domain, missing
// profiles, rate-limit signals) are never echoed back to the browser.
const qaAccessErrorCopy: Record<number, { error: string; message: string }> = {
  400: {
    error: "invalid-request",
    message: "Check the QA domain and try again.",
  },
  401: {
    error: "qa-not-authorized",
    message: "QA access was not authorized for this domain.",
  },
  403: {
    error: "qa-not-authorized",
    message: "QA access was not authorized for this domain.",
  },
  404: {
    error: "qa-unavailable",
    message: "QA access is not available on this server.",
  },
  412: {
    error: "qa-upgrade-required",
    message: "This QA client must be upgraded before it can continue.",
  },
  429: {
    error: "qa-rate-limited",
    message: "Too many QA access attempts. Try again later.",
  },
}

// Maps a refused or failed QA accelerator call to an HTTP response for the
// /auth/qa route: expected refusals become 4xx, anything else a generic 500.
export function toQaAccessErrorResponse(error: unknown): QaAccessErrorResponse {
  const status =
    error instanceof TRPCError ? getHTTPStatusCodeFromError(error) : 500
  const copy = qaAccessErrorCopy[status]

  if (copy && status >= 400 && status < 500) {
    return { body: copy, status }
  }

  return {
    body: {
      error: "qa-access-failed",
      message: "QA access could not be checked. Try again.",
    },
    status: 500,
  }
}
