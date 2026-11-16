import { describe, expect, test } from "bun:test"

import {
  AUTH_MESSAGES,
  getRecoveryCompleteErrorPresentation,
  getRecoveryRequestErrorPresentation,
  getSignInErrorPresentation,
} from "./auth-errors"
import { RequestTimeoutError, withRequestTimeout } from "@/lib/request-timeout"

function trpcError(code: string, message = "Sign in again to continue.") {
  const error = new Error(message) as Error & {
    data: { code: string; httpStatus: number }
  }
  error.name = "TRPCClientError"
  error.data = {
    code,
    httpStatus:
      code === "UNAUTHORIZED"
        ? 401
        : code === "FORBIDDEN"
          ? 403
          : code === "TOO_MANY_REQUESTS"
            ? 429
            : code === "NOT_FOUND"
              ? 404
              : code === "INTERNAL_SERVER_ERROR"
                ? 500
                : 400,
  }
  return error
}

function networkError() {
  const error = new Error("Network request failed") as Error & {
    cause?: unknown
  }
  error.name = "TRPCClientError"
  error.cause = new TypeError("Network request failed")
  return error
}

describe("sign-in errors", () => {
  test("wrong credentials show one neutral message", () => {
    expect(getSignInErrorPresentation(trpcError("UNAUTHORIZED"))).toEqual({
      kind: "invalid",
      message: AUTH_MESSAGES.invalid,
      retryable: false,
    })
  })

  test("rate limits keep their own message", () => {
    const result = getSignInErrorPresentation(
      trpcError("TOO_MANY_REQUESTS", "Too many attempts. Wait a few minutes")
    )
    expect(result.kind).toBe("rate-limited")
    expect(result.message).toBe(AUTH_MESSAGES.rateLimited)
  })

  test("inactive accounts are told so", () => {
    expect(getSignInErrorPresentation(trpcError("FORBIDDEN")).kind).toBe(
      "inactive"
    )
  })

  test("network failures and offline state show a retryable offline message", () => {
    expect(getSignInErrorPresentation(networkError())).toMatchObject({
      kind: "offline",
      retryable: true,
    })
    expect(
      getSignInErrorPresentation(trpcError("UNAUTHORIZED"), { offline: true })
        .kind
    ).toBe("offline")
  })

  test("timeouts and server errors are retryable", () => {
    expect(
      getSignInErrorPresentation(new RequestTimeoutError()).kind
    ).toBe("timeout")
    expect(
      getSignInErrorPresentation(trpcError("INTERNAL_SERVER_ERROR"))
    ).toMatchObject({ kind: "unknown", retryable: true })
  })

  test("a programming TypeError is not reported as offline", () => {
    expect(
      getSignInErrorPresentation(new TypeError("undefined is not a function"))
        .kind
    ).toBe("unknown")
  })
})

describe("recovery errors", () => {
  test("requesting a code fails only for limits and connection", () => {
    expect(
      getRecoveryRequestErrorPresentation(trpcError("TOO_MANY_REQUESTS")).kind
    ).toBe("rate-limited")
    expect(getRecoveryRequestErrorPresentation(networkError()).kind).toBe(
      "offline"
    )
  })

  test("a rejected code sends the member back to the code step", () => {
    for (const code of ["NOT_FOUND", "CONFLICT", "BAD_REQUEST"]) {
      expect(getRecoveryCompleteErrorPresentation(trpcError(code))).toEqual({
        kind: "code",
        message: AUTH_MESSAGES.invalidCode,
        retryable: false,
      })
    }
  })

  test("an inactive account after recovery is not shown as a code error", () => {
    expect(
      getRecoveryCompleteErrorPresentation(trpcError("FORBIDDEN")).kind
    ).toBe("inactive")
    expect(
      getRecoveryCompleteErrorPresentation(
        trpcError(
          "PRECONDITION_FAILED",
          "This account is not active for the cooperative."
        )
      ).kind
    ).toBe("inactive")
  })

  test("an invalid, expired or used code is a code error whatever its status", () => {
    // Device finding (T02): a missing challenge answers PRECONDITION_FAILED.
    expect(
      getRecoveryCompleteErrorPresentation(
        trpcError(
          "PRECONDITION_FAILED",
          "This code is invalid or no longer available."
        )
      ).kind
    ).toBe("code")
    expect(
      getRecoveryCompleteErrorPresentation(trpcError("PRECONDITION_FAILED"))
        .kind
    ).toBe("code")
  })
})

describe("withRequestTimeout", () => {
  test("resolves fast requests and aborts slow ones", async () => {
    await expect(withRequestTimeout(async () => "ok", 50)).resolves.toBe("ok")
    let aborted = false
    const slow = withRequestTimeout(
      (signal) =>
        new Promise((resolve) => {
          signal.addEventListener("abort", () => {
            aborted = true
          })
          setTimeout(resolve, 200)
        }),
      10
    )
    await expect(slow).rejects.toBeInstanceOf(RequestTimeoutError)
    expect(aborted).toBe(true)
  })
})
