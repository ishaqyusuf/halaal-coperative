import { describe, expect, it } from "bun:test"
import {
  getDashboardErrorReport,
  getDashboardTrpcErrorReport,
  isDashboardSentryEnabled,
  isServerCapturedBoundaryError,
  sanitizeDashboardSentryEvent,
} from "./sentry-policy"

describe("dashboard Sentry policy", () => {
  it("requires an explicit production or preview environment and DSN", () => {
    expect(
      isDashboardSentryEnabled({
        deploymentEnvironment: "preview",
        dsn: "https://dsn",
        nodeEnvironment: "production",
      })
    ).toBe(true)
    expect(
      isDashboardSentryEnabled({
        deploymentEnvironment: "preview",
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

  it("reports hosted tRPC failures with the procedure as the operation", () => {
    const missing = getDashboardTrpcErrorReport({
      error: Object.assign(
        new Error('No procedure found on path "mobile.admin.finance.desk"'),
        { code: "NOT_FOUND", name: "TRPCError" }
      ),
      path: "mobile.admin.finance.desk",
      requestId: "018f47f3-6f5a-4a42-8d8c-50d13c091111",
      type: "query",
    })
    expect(missing.classified.reportable).toBe(true)
    expect(missing.captureContext.tags).toMatchObject({
      operation: "mobile.admin.finance.desk",
      procedure_type: "query",
      source: "dashboard.trpc",
    })
    const denied = getDashboardTrpcErrorReport({
      error: Object.assign(new Error("UNAUTHORIZED"), {
        code: "UNAUTHORIZED",
        name: "TRPCError",
      }),
      path: "mobile.member.home",
      type: "query",
    })
    expect(denied.classified.reportable).toBe(false)
  })
})
