import { describe, expect, it } from "bun:test"
import { AppError } from "@halaalvest/errors"
import { buildErrorReport, getReportableError, isObservabilityEnabled } from "."

describe("observability policy", () => {
  it("enables reporting only for an explicit production deployment with a DSN", () => {
    expect(
      isObservabilityEnabled({
        deploymentEnvironment: "production",
        dsn: "https://dsn",
        nodeEnvironment: "production",
      })
    ).toBe(true)
    expect(
      isObservabilityEnabled({
        deploymentEnvironment: "preview",
        dsn: "https://dsn",
        nodeEnvironment: "production",
      })
    ).toBe(false)
  })

  it("builds bounded operational context and removes cooperative data", () => {
    const error = Object.assign(new Error("transaction expired"), {
      code: "P2028",
    })
    const report = buildErrorReport(error, {
      extra: {
        attempt: 2,
        memberId: "member-1",
        contributionAmount: 5000,
        paymentReference: "private-payment",
        runId: "run-123",
      },
      operation: "contributions.record",
      requestId: "request-123",
      runtime: "api",
      source: "trpc",
      tags: {
        procedure: "contributions.record",
        tenantId: "tenant-1",
        userEmail: "member@example.test",
      },
    })

    expect(report.classified.code).toBe("DATABASE_TRANSACTION_TIMEOUT")
    expect(report.captureContext.extra).toEqual({
      attempt: 2,
      runId: "run-123",
    })
    expect(report.captureContext.tags).toMatchObject({
      error_category: "database",
      error_code: "DATABASE_TRANSACTION_TIMEOUT",
      error_reference: report.classified.referenceId,
      operation: "contributions.record",
      procedure: "contributions.record",
      request_id: "request-123",
      retryable: "true",
      runtime: "api",
      source: "trpc",
    })
    expect(report.captureContext.tags).not.toHaveProperty("tenantId")
    expect(report.captureContext.tags).not.toHaveProperty("userEmail")
  })

  it("reports a typed failure using its original cause", () => {
    const cause = new Error("provider failed")
    const error = new AppError({
      cause,
      code: "PROVIDER_UNAVAILABLE",
    })

    expect(getReportableError(error)).toBe(cause)
  })
})
