import { describe, expect, test } from "bun:test"
import {
  hasDashboardErrorReportDetails,
  sanitizeDashboardErrorReport,
} from "./error-reporting"

describe("dashboard error audit receipt", () => {
  test("keeps only bounded classification metadata", () => {
    const report = sanitizeDashboardErrorReport({
      code: "DATABASE_TRANSACTION_TIMEOUT",
      message: "Member balance and token=abc123",
      path: "/members/member-1/statement",
      referenceId: "ERR-01HZY8W1D4W8R0D8A90M5ZXYZZ",
      retryable: false,
      source: "dashboard.error_boundary",
      stack: "Authorization: Bearer abc.def.ghi",
      userAgent: "Private browser fingerprint",
    })

    expect(report).toEqual({
      category: "database",
      code: "DATABASE_TRANSACTION_TIMEOUT",
      referenceId: "ERR-01HZY8W1D4W8R0D8A90M5ZXYZZ",
      retryable: true,
      source: "dashboard.error_boundary",
    })
    expect(JSON.stringify(report)).not.toContain("Member")
    expect(JSON.stringify(report)).not.toContain("Authorization")
    expect(JSON.stringify(report)).not.toContain("member-1")
  })

  test("rejects forged codes, references, and sources", () => {
    expect(
      hasDashboardErrorReportDetails(
        sanitizeDashboardErrorReport({
          code: "CUSTOM_PRIVATE_ERROR",
          referenceId: "member@example.test",
          source: "/members/member-1",
        })
      )
    ).toBe(false)
  })

  test("accepts a complete safe receipt", () => {
    const report = sanitizeDashboardErrorReport({
      code: "UNEXPECTED",
      referenceId: "ERR-01HZY8W1D4W8R0D8A90M5ZXYZZ",
      source: "dashboard.global_error",
    })

    expect(hasDashboardErrorReportDetails(report)).toBe(true)
  })
})
