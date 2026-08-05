import { describe, expect, it } from "bun:test"
import { getRestErrorResponse } from "./error-response"

describe("REST public error contract", () => {
  it("returns a safe status and envelope for an infrastructure failure", () => {
    const result = getRestErrorResponse(
      Object.assign(new Error("Prisma transaction expired"), { code: "P2028" })
    )

    expect(result.status).toBe(500)
    expect(result.body.error).toMatchObject({
      code: "DATABASE_TRANSACTION_TIMEOUT",
      retryable: true,
    })
    expect(JSON.stringify(result.body)).not.toContain("Prisma")
  })
})
