import { describe, expect, it } from "bun:test"
import {
  getDashboardErrorReport,
  isDashboardSentryEnabled,
  isServerCapturedBoundaryError,
  sanitizeDashboardSentryEvent,
} from "./sentry-policy"

describe("dashboard Sentry policy", () => {
  it("requires an explicit production environment and DSN", () => {
    expect(
      isDashboardSentryEnabled({
        deploymentEnvironment: "preview",
        dsn: "https://dsn",
        nodeEnvironment: "production",
      })
    ).toBe(false)
    expect(
      isDashboardSentryEnabled({
        deploymentEnvironment: "production",
        dsn: "https://dsn",
        nodeEnvironment: "production",
      })
    ).toBe(true)
  })

  it("removes identity, requests, raw messages, and arbitrary query data", () => {
    const event = sanitizeDashboardSentryEvent({
      breadcrumbs: [{ message: "member-1 opened a loan" }],
      exception: { values: [{ type: "Error", value: "member-1 failed" }] },
      extra: { query_key: "member-1" },
      message: "member-1 failed",
      request: { url: "https://dashboard.test/members/member-1" },
      tags: {
        error_code: "UNEXPECTED",
        error_reference: "ERR-DASH001",
        method: "POST",
        query_key: "member-1",
        runtime: "dashboard",
        source: "dashboard.request",
      },
      user: { id: "member-1" },
    })

    expect(event).toEqual({
      exception: {
        values: [{ type: "Error", value: "Captured UNEXPECTED" }],
      },
      fingerprint: ["UNEXPECTED", "unknown"],
      tags: {
        error_code: "UNEXPECTED",
        error_reference: "ERR-DASH001",
        method: "POST",
        runtime: "dashboard",
        source: "dashboard.request",
      },
    })
    expect(JSON.stringify(event)).not.toContain("member-1")
  })

  it("uses fixed sources and avoids recapturing digested server errors", () => {
    const report = getDashboardErrorReport(
      new Error("private member failure"),
      "dashboard.query_cache"
    )
    expect(report.captureContext.tags).toMatchObject({
      runtime: "dashboard",
      source: "dashboard.query_cache",
    })
    const digested = Object.assign(new Error(), { digest: "x" })
    const serverReport = getDashboardErrorReport(digested, "dashboard.request")
    const clientReport = getDashboardErrorReport(
      digested,
      "dashboard.error_boundary"
    )
    expect(serverReport.classified.referenceId).toBe(
      clientReport.classified.referenceId
    )
    expect(isServerCapturedBoundaryError(digested)).toBe(true)
    expect(isServerCapturedBoundaryError(new Error())).toBe(false)
  })
})
