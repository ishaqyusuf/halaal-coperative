import { describe, expect, test } from "bun:test"
import {
  hasDashboardErrorReportDetails,
  sanitizeDashboardErrorReport,
} from "./error-reporting"

describe("dashboard error reporting", () => {
  test("redacts sensitive values and normalizes route paths", () => {
    const report = sanitizeDashboardErrorReport(
      {
        digest: "next-digest-123",
        message: "Request failed with token=abc123",
        path: "https://coop.example.test/members?token=secret",
        stack: "Error: failed\nAuthorization: Bearer abc.def.ghi\nBearer xyz",
      },
      {
        userAgent: "Browser secret=client-token",
      },
    )

    expect(report.digest).toBe("next-digest-123")
    expect(report.message).toBe("Request failed with token=[redacted]")
    expect(report.path).toBe("/members")
    expect(report.stack).toContain("Authorization=[redacted]")
    expect(report.stack).toContain("Bearer [redacted]")
    expect(report.userAgent).toBe("Browser secret=[redacted]")
  })

  test("truncates long stack fields before audit storage", () => {
    const report = sanitizeDashboardErrorReport({
      componentStack: "Component".repeat(300),
      stack: "Stack".repeat(500),
    })

    expect(report.componentStack?.length).toBeLessThanOrEqual(1800)
    expect(report.stack?.length).toBeLessThanOrEqual(1800)
    expect(report.stack?.endsWith("...")).toBe(true)
  })

  test("requires at least one usable error detail", () => {
    const emptyReport = sanitizeDashboardErrorReport({
      path: "/settings",
      source: "dashboard.error_boundary",
    })
    const usefulReport = sanitizeDashboardErrorReport({
      message: "Something failed",
    })

    expect(hasDashboardErrorReportDetails(emptyReport)).toBe(false)
    expect(hasDashboardErrorReportDetails(usefulReport)).toBe(true)
  })
})
