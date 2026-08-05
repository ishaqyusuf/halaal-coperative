import { describe, expect, it } from "bun:test"
import { ExpectedQueryError, QueryInfrastructureError } from "./query-error"

describe("database query errors", () => {
  it("marks deliberate domain outcomes as non-reportable", () => {
    expect(ExpectedQueryError.notFound("Member not found.")).toMatchObject({
      code: "NOT_FOUND",
      reportable: false,
    })
    expect(
      ExpectedQueryError.conflict("This request is no longer active.")
    ).toMatchObject({ code: "CONFLICT", reportable: false })
    expect(
      ExpectedQueryError.precondition("Complete setup before continuing.")
    ).toMatchObject({ code: "PRECONDITION_FAILED", reportable: false })
    expect(
      ExpectedQueryError.permission("This user cannot access the record.")
    ).toMatchObject({ code: "PERMISSION_DENIED", reportable: false })
    expect(
      ExpectedQueryError.validation("Amount must be positive.")
    ).toMatchObject({ code: "VALIDATION_FAILED", reportable: false })
  })

  it("keeps explicit configuration and invariant failures reportable", () => {
    const error = new QueryInfrastructureError("Database not configured")

    expect(error).toMatchObject({ code: "UNEXPECTED", reportable: true })
    expect(error.publicMessage).toBe("Something went wrong. Please try again.")
  })
})
