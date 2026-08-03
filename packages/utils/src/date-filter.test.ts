import { describe, expect, test } from "bun:test"
import {
  createDatePresetSelection,
  dateFilterPresets,
  getDatePresetLabel,
  resolveDateFilter,
} from "./date-filter"

const referenceDate = new Date("2026-08-02T12:00:00.000Z")

describe("date filter presets", () => {
  test("keeps the GND Sales Orders suggestion order and labels", () => {
    expect(dateFilterPresets).toEqual([
      "yesterday",
      "today",
      "this week",
      "last week",
      "this month",
      "last month",
      "last 2 months",
      "last 3 months",
      "last 6 months",
      "before last month",
      "before last 3 months",
      "before last 6 months",
    ])
    expect(getDatePresetLabel("before last month")).toBe("Over a month")
    expect(getDatePresetLabel("before last 3 months")).toBe("Over 3 months")
    expect(createDatePresetSelection("today")).toEqual(["today"])
  })

  test("resolves day, week, and month presets", () => {
    expect(resolveDateFilter(["today"], referenceDate)).toEqual({
      from: "2026-08-02",
      to: "2026-08-02",
    })
    expect(resolveDateFilter(["yesterday"], referenceDate)).toEqual({
      from: "2026-08-01",
      to: "2026-08-01",
    })
    expect(resolveDateFilter(["this week"], referenceDate)).toEqual({
      from: "2026-08-02",
      to: "2026-08-08",
    })
    expect(resolveDateFilter(["last week"], referenceDate)).toEqual({
      from: "2026-07-26",
      to: "2026-08-01",
    })
    expect(resolveDateFilter(["this month"], referenceDate)).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    })
  })

  test("resolves complete previous-month and cutoff presets", () => {
    expect(resolveDateFilter(["last 3 months"], referenceDate)).toEqual({
      from: "2026-05-01",
      to: "2026-07-31",
    })
    expect(resolveDateFilter(["last 6 months"], referenceDate)).toEqual({
      from: "2026-02-01",
      to: "2026-07-31",
    })
    expect(resolveDateFilter(["before last month"], referenceDate)).toEqual({
      to: "2026-06-30",
    })
    expect(resolveDateFilter(["before last 3 months"], referenceDate)).toEqual({
      to: "2026-04-30",
    })
  })

  test("handles year rollover and leap-year February", () => {
    expect(
      resolveDateFilter(["last 3 months"], new Date("2026-01-15T12:00:00.000Z"))
    ).toEqual({ from: "2025-10-01", to: "2025-12-31" })
    expect(
      resolveDateFilter(["last 2 months"], new Date("2024-04-10T12:00:00.000Z"))
    ).toEqual({ from: "2024-02-01", to: "2024-03-31" })
  })
})

describe("explicit date filter ranges", () => {
  test("supports complete and open-ended boundaries", () => {
    expect(resolveDateFilter(["2026-02-01", "2026-02-14"])).toEqual({
      from: "2026-02-01",
      to: "2026-02-14",
    })
    expect(resolveDateFilter(["2026-02-01", "-"])).toEqual({
      from: "2026-02-01",
    })
    expect(resolveDateFilter(["-", "2026-02-14"])).toEqual({
      to: "2026-02-14",
    })
  })

  test("rejects invalid and reversed ranges safely", () => {
    expect(resolveDateFilter(["not-a-date"])).toBeNull()
    expect(resolveDateFilter(["2026-02-30", "-"])).toBeNull()
    expect(resolveDateFilter(["2026-03-01", "2026-02-01"])).toBeNull()
    expect(resolveDateFilter(["-", "-"])).toBeNull()
    expect(resolveDateFilter([])).toBeUndefined()
    expect(resolveDateFilter(undefined)).toBeUndefined()
  })
})
