import { describe, expect, test } from "bun:test"

import {
  canManageMobileAdminAccess,
  canUseMobileReportActions,
  canViewMobileAdminReports,
} from "./admin-reports-access-policy"

describe("mobile reports and access presentation policy", () => {
  test("mirrors report visibility without granting client authority", () => {
    expect(canViewMobileAdminReports("tenant_admin")).toBe(true)
    expect(canViewMobileAdminReports("finance_officer")).toBe(true)
    expect(canViewMobileAdminReports("operations_officer")).toBe(false)
    expect(canViewMobileAdminReports("member")).toBe(false)
  })

  test("only presents role management to cooperative administrators", () => {
    expect(canManageMobileAdminAccess("tenant_admin")).toBe(true)
    expect(canManageMobileAdminAccess("finance_officer")).toBe(false)
    expect(canManageMobileAdminAccess("operations_officer")).toBe(false)
    expect(canManageMobileAdminAccess("member")).toBe(false)
  })

  test("blocks export actions when the report source is stale", () => {
    expect(canUseMobileReportActions("live")).toBe(true)
    expect(canUseMobileReportActions(undefined)).toBe(true)
    expect(canUseMobileReportActions("stale")).toBe(false)
  })
})
