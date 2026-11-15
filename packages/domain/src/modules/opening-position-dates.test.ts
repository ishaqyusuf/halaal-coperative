import { describe, expect, test } from "bun:test"
import {
  findOpeningPositionDateIssues,
  getDefaultOpeningPositionDate,
  getOpeningPositionQuickFillDates,
} from "./opening-position-dates"

describe("opening position dates", () => {
  test("suggests the later of the cooperative start and the joined date", () => {
    expect(
      getDefaultOpeningPositionDate({
        joinedAt: "2026-08-01",
        tenantStartDate: "2025-11-03",
      })
    ).toBe("2026-08-01")
    expect(
      getDefaultOpeningPositionDate({
        joinedAt: "2024-01-15",
        tenantStartDate: "2025-11-03",
      })
    ).toBe("2025-11-03")
    expect(
      getDefaultOpeningPositionDate({ joinedAt: null, tenantStartDate: null })
    ).toBe("")
  })

  test("flags the QA case: opening and financing dates before joining", () => {
    const issues = findOpeningPositionDateIssues({
      dates: {
        activeFinancingOpenedAt: "2026-01-01",
        openingDate: "2025-11-03",
        procurementOpenedAt: "2026-09-01",
      },
      joinedAt: "2026-08-01T00:00:00.000Z",
    })

    expect(issues.map((issue) => issue.field)).toEqual([
      "activeFinancingOpenedAt",
      "openingDate",
      "procurementOpenedAt",
    ])
    expect(issues[1]?.message).toBe(
      "Opening date (3 Nov 2025) is before this member joined on 1 Aug 2026."
    )
  })

  test("flags the rerun QA case: financing that started after the opening date", () => {
    const issues = findOpeningPositionDateIssues({
      dates: {
        activeFinancingOpenedAt: "2026-08-03",
        foodPurchaseOpenedAt: "2012-09-11",
        openingDate: "2012-09-11",
      },
      joinedAt: "2012-09-11",
    })

    expect(issues).toEqual([
      {
        field: "activeFinancingOpenedAt",
        message:
          "Financing start date (3 Aug 2026) is after the opening date (11 Sep 2012). Use an opening date on or after it.",
      },
    ])
  })

  test("checks start dates against the opening date when the joined date is unknown", () => {
    expect(
      findOpeningPositionDateIssues({
        dates: { openingDate: "2026-11-15", procurementOpenedAt: "2026-12-01" },
        joinedAt: null,
      }).map((issue) => issue.field)
    ).toEqual(["procurementOpenedAt"])
  })

  test("accepts dates on or after the joined date and blank optional dates", () => {
    expect(
      findOpeningPositionDateIssues({
        dates: {
          activeFinancingOpenedAt: "",
          foodPurchaseOpenedAt: null,
          openingDate: "2026-08-01",
        },
        joinedAt: "2026-08-01",
      })
    ).toEqual([])
  })

  test("skips the check when the joined date is unknown", () => {
    expect(
      findOpeningPositionDateIssues({
        dates: { openingDate: "2000-01-01" },
        joinedAt: "",
      })
    ).toEqual([])
  })

  test("Quick Fill start dates never precede the joined date", () => {
    expect(
      getOpeningPositionQuickFillDates({
        joinedAt: "2026-08-01",
        openingDate: "2026-08-01",
      })
    ).toEqual({
      activeFinancingOpenedAt: "2026-08-01",
      foodPurchaseOpenedAt: "2026-08-01",
      procurementOpenedAt: "2026-08-01",
    })
    expect(
      getOpeningPositionQuickFillDates({
        joinedAt: "2024-01-01",
        openingDate: "2026-11-01",
      })
    ).toEqual({
      activeFinancingOpenedAt: "2026-06-01",
      foodPurchaseOpenedAt: "2026-10-01",
      procurementOpenedAt: "2026-11-01",
    })
  })
})
