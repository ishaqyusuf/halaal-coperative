import { describe, expect, it } from "bun:test"
import {
  getMarketingErrorReport,
  isMarketingSentryEnabled,
  isServerCapturedMarketingError,
  sanitizeMarketingSentryEvent,
} from "./sentry-policy"

describe("marketing Sentry policy", () => {
  it("requires explicit production configuration", () => {
    expect(
      isMarketingSentryEnabled({
        deploymentEnvironment: "production",
        dsn: "https://dsn",
        nodeEnvironment: "development",
      })
    ).toBe(false)
    expect(
      isMarketingSentryEnabled({
        deploymentEnvironment: "production",
        dsn: "https://dsn",
        nodeEnvironment: "production",
      })
    ).toBe(true)
  })

  it("keeps only static route metadata and scrubbed exceptions", () => {
    const event = sanitizeMarketingSentryEvent({
      exception: { values: [{ type: "Error", value: "email private@test" }] },
      request: { data: { email: "private@test" }, url: "/signup?token=x" },
      tags: {
        error_code: "PROVIDER_UNAVAILABLE",
        error_reference: "ERR-MKT001",
        method: "POST",
        provider: "email",
        runtime: "marketing",
        source: "marketing.route",
        token: "x",
      },
      user: { email: "private@test" },
    })

    expect(event).toEqual({
      exception: {
        values: [{ type: "Error", value: "Captured PROVIDER_UNAVAILABLE" }],
      },
      fingerprint: ["PROVIDER_UNAVAILABLE", "unknown"],
      tags: {
        error_code: "PROVIDER_UNAVAILABLE",
        error_reference: "ERR-MKT001",
        method: "POST",
        provider: "email",
        runtime: "marketing",
        source: "marketing.route",
      },
    })
    expect(JSON.stringify(event)).not.toContain("private@test")
  })

  it("uses fixed sources and recognizes digested server errors", () => {
    const report = getMarketingErrorReport(
      new Error("private signup failure"),
      "marketing.route",
      { method: "POST" }
    )
    expect(report.captureContext.tags).toMatchObject({
      method: "POST",
      runtime: "marketing",
      source: "marketing.route",
    })
    const digested = Object.assign(new Error(), { digest: "x" })
    const serverReport = getMarketingErrorReport(digested, "marketing.request")
    const clientReport = getMarketingErrorReport(
      digested,
      "marketing.error_boundary"
    )
    expect(serverReport.classified.referenceId).toBe(
      clientReport.classified.referenceId
    )
    expect(isServerCapturedMarketingError(digested)).toBe(true)
  })
})
