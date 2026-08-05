import { describe, expect, test } from "bun:test"
import { AppError } from "@halaalvest/errors"
import { getMarketingErrorResponse } from "./error-response"

describe("marketing API error response", () => {
  test("does not expose technical provider or database messages", () => {
    const response = getMarketingErrorResponse(
      Object.assign(new Error("Prisma transaction failed for member-1"), {
        code: "P2028",
      })
    )

    expect(response.status).toBe(500)
    expect(response.body.error.code).toBe("DATABASE_TRANSACTION_TIMEOUT")
    expect(JSON.stringify(response.body)).not.toContain("Prisma")
    expect(JSON.stringify(response.body)).not.toContain("member-1")
  })

  test("preserves deliberately authored public guidance", () => {
    const response = getMarketingErrorResponse(
      new AppError({
        code: "VALIDATION_FAILED",
        publicMessage: "This approval link is no longer valid.",
      })
    )

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe(
      "This approval link is no longer valid."
    )
  })
})
