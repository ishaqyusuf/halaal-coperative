import { describe, expect, test } from "bun:test"
import {
  getMobileReportCatalog,
  MOBILE_REPORT_KEYS,
  MOBILE_REPORT_ROW_LIMIT,
} from "./mobile-reports"

describe("mobile report catalogue policy", () => {
  test("keeps every required report visible and available to every workspace", () => {
    const catalog = getMobileReportCatalog()

    expect(catalog.map((item) => item.key)).toEqual([...MOBILE_REPORT_KEYS])
    // Triage 2.8: no plan report or audit depth gates a report any more.
    expect(catalog.every((item) => item.available)).toBe(true)
    expect(catalog.find((item) => item.key === "audit")?.available).toBe(true)
    expect(
      catalog.find((item) => item.key === "openingBalances")?.available
    ).toBe(true)
  })

  test("bounds every export with the same row limit", () => {
    const catalog = getMobileReportCatalog()

    expect(MOBILE_REPORT_ROW_LIMIT).toBe(5_000)
    expect(
      catalog.every((item) => item.rowLimit === MOBILE_REPORT_ROW_LIMIT)
    ).toBe(true)
  })
})
