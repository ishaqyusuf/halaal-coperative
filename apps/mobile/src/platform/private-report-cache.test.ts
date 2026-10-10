import { describe, expect, test } from "bun:test"
import { isLegacyPrivateReportFilename } from "./private-report-cache"

describe("legacy native report cache", () => {
  test("recognizes only HalaalVest's former report filename shapes", () => {
    expect(isLegacyPrivateReportFilename("amanah-members-report.csv")).toBe(
      true
    )
    expect(
      isLegacyPrivateReportFilename("amanah-memberStatements-report.csv")
    ).toBe(true)
    expect(isLegacyPrivateReportFilename("amanah-M-001-statement.csv")).toBe(
      true
    )
    expect(isLegacyPrivateReportFilename("amanah-other-report.csv")).toBe(false)
    expect(isLegacyPrivateReportFilename("members-report.csv")).toBe(false)
    expect(isLegacyPrivateReportFilename("amanah-audit-report.json")).toBe(
      false
    )
    expect(
      isLegacyPrivateReportFilename("nested/amanah-members-report.csv")
    ).toBe(false)
  })
})
