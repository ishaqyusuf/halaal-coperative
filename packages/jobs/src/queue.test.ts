import { describe, expect, test } from "bun:test"
import { runWithRetry } from "./queue"

describe("job retry error contract", () => {
  test("does not retry a non-retryable validation failure", async () => {
    let calls = 0
    const result = await runWithRetry(
      async () => {
        calls += 1
        throw Object.assign(new Error("private invalid payroll row"), {
          issues: [],
          name: "ZodError",
        })
      },
      {},
      { baseDelayMs: 0, maxAttempts: 4 }
    )

    expect(calls).toBe(1)
    expect(result.attempts).toBe(1)
    expect(result.error?.code).toBe("VALIDATION_FAILED")
    expect(JSON.stringify(result)).not.toContain("payroll")
  })

  test("retries a transient database timeout and returns a safe receipt", async () => {
    let calls = 0
    const result = await runWithRetry(
      async () => {
        calls += 1
        throw Object.assign(
          new Error("Prisma transaction expired for member-1"),
          {
            code: "P2028",
          }
        )
      },
      {},
      { baseDelayMs: 0, maxAttempts: 2 }
    )

    expect(calls).toBe(2)
    expect(result.error).toMatchObject({
      code: "DATABASE_TRANSACTION_TIMEOUT",
      retryable: true,
    })
    expect(JSON.stringify(result)).not.toContain("Prisma")
    expect(JSON.stringify(result)).not.toContain("member-1")
  })
})
