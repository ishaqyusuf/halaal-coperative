import { describe, expect, test } from "bun:test"
import {
  APP_PAGE_SIZE_DEFAULT,
  APP_PAGE_SIZE_MAX,
  appQueryRetryDelay,
  clampPageSize,
  isUnrecoverableQueryError,
  shouldRetryAppQuery,
} from "./app-query-policy"

function trpcError(code: string, httpStatus?: number) {
  return Object.assign(new Error(code), {
    data: { code, httpStatus },
    name: "TRPCClientError",
  })
}

describe("query error-retry policy", () => {
  test("never retries auth, permission or validation failures", () => {
    for (const code of [
      "UNAUTHORIZED",
      "FORBIDDEN",
      "BAD_REQUEST",
      "NOT_FOUND",
      "UNPROCESSABLE_CONTENT",
      "PRECONDITION_FAILED",
    ]) {
      expect(shouldRetryAppQuery(0, trpcError(code))).toBe(false)
    }
  })

  test("reads codes from the tRPC shape as well as data", () => {
    const shaped = { shape: { data: { code: "FORBIDDEN" } } }
    expect(isUnrecoverableQueryError(shaped)).toBe(true)
  })

  test("treats other 4xx statuses as unrecoverable, but not 408/429", () => {
    expect(isUnrecoverableQueryError({ status: 410 })).toBe(true)
    expect(isUnrecoverableQueryError({ status: 408 })).toBe(false)
    expect(isUnrecoverableQueryError({ status: 429 })).toBe(false)
  })

  test("does not retry offline commands or schema mismatches", () => {
    expect(shouldRetryAppQuery(0, { name: "MobileOfflineOperationError" })).toBe(false)
    expect(shouldRetryAppQuery(0, { name: "ZodError" })).toBe(false)
  })

  test("retries transient failures at most twice", () => {
    const timeout = trpcError("INTERNAL_SERVER_ERROR", 500)
    expect(shouldRetryAppQuery(0, timeout)).toBe(true)
    expect(shouldRetryAppQuery(1, timeout)).toBe(true)
    expect(shouldRetryAppQuery(2, timeout)).toBe(false)
    expect(shouldRetryAppQuery(0, new TypeError("Network request failed"))).toBe(true)
  })

  test("backs off exponentially with a cap", () => {
    expect(appQueryRetryDelay(0)).toBe(1_000)
    expect(appQueryRetryDelay(1)).toBe(2_000)
    expect(appQueryRetryDelay(10)).toBe(8_000)
  })
})

describe("bounded page sizes", () => {
  test("defaults and clamps", () => {
    expect(clampPageSize()).toBe(APP_PAGE_SIZE_DEFAULT)
    expect(clampPageSize(0)).toBe(APP_PAGE_SIZE_DEFAULT)
    expect(clampPageSize(500)).toBe(APP_PAGE_SIZE_MAX)
    expect(clampPageSize(12.7)).toBe(12)
    expect(clampPageSize(Number.NaN)).toBe(APP_PAGE_SIZE_DEFAULT)
  })
})
