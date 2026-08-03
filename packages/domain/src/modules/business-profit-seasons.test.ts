import { describe, expect, test } from "bun:test"
import {
  getBusinessProfitSeasonKey,
  getBusinessProfitSeasonPeriod,
  isBusinessProfitDateWithinPeriod,
  toBusinessProfitDateOnly,
} from "./business-profit-seasons"

describe("business profit seasons", () => {
  test("resolves an annual calendar-year season", () => {
    const period = getBusinessProfitSeasonPeriod("2026-08-02", {
      financialYearStartMonth: 1,
      profitDistributionFrequency: "annual",
    })

    expect(toBusinessProfitDateOnly(period.periodStart)).toBe("2026-01-01")
    expect(toBusinessProfitDateOnly(period.periodEnd)).toBe("2026-12-31")
  })

  test("resolves an annual season across a non-January financial year", () => {
    const period = getBusinessProfitSeasonPeriod("2026-02-28", {
      financialYearStartMonth: 4,
      profitDistributionFrequency: "annual",
    })

    expect(
      getBusinessProfitSeasonKey(period.periodStart, period.periodEnd)
    ).toBe("2025-04-01:2026-03-31")
  })

  test("resolves quarterly and semi-annual boundaries", () => {
    const quarterly = getBusinessProfitSeasonPeriod("2026-08-02", {
      financialYearStartMonth: 4,
      profitDistributionFrequency: "quarterly",
    })
    const semiAnnual = getBusinessProfitSeasonPeriod("2026-08-02", {
      financialYearStartMonth: 4,
      profitDistributionFrequency: "semi_annual",
    })

    expect(
      getBusinessProfitSeasonKey(quarterly.periodStart, quarterly.periodEnd)
    ).toBe("2026-07-01:2026-09-30")
    expect(
      getBusinessProfitSeasonKey(semiAnnual.periodStart, semiAnnual.periodEnd)
    ).toBe("2026-04-01:2026-09-30")
  })

  test("treats season boundaries as inclusive", () => {
    const period = getBusinessProfitSeasonPeriod("2024-02-29", {
      financialYearStartMonth: 1,
      profitDistributionFrequency: "annual",
    })

    expect(isBusinessProfitDateWithinPeriod("2024-01-01", period)).toBe(true)
    expect(isBusinessProfitDateWithinPeriod("2024-12-31", period)).toBe(true)
    expect(isBusinessProfitDateWithinPeriod("2023-12-31", period)).toBe(false)
  })

  test("uses a single explicit day for an ad-hoc historical bucket", () => {
    const period = getBusinessProfitSeasonPeriod("2026-08-02", {
      financialYearStartMonth: 1,
      profitDistributionFrequency: "ad_hoc",
    })

    expect(
      getBusinessProfitSeasonKey(period.periodStart, period.periodEnd)
    ).toBe("2026-08-02:2026-08-02")
  })
})
