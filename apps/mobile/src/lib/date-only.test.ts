import { describe, expect, test } from "bun:test"
import {
  addMonthsDateOnly,
  buildCalendarDays,
  clampDateOnly,
  compareDateOnly,
  formatDateOnly,
  isValidDateOnly,
  parseDateOnly,
} from "./date-only"

describe("mobile date-only calendar helpers", () => {
  test("rejects normalized and malformed calendar dates", () => {
    expect(isValidDateOnly("2026-02-29")).toBe(false)
    expect(isValidDateOnly("2028-02-29")).toBe(true)
    expect(isValidDateOnly("2026-2-09")).toBe(false)
    expect(parseDateOnly("not-a-date")).toBeNull()
  })

  test("builds a stable six-week calendar grid", () => {
    const days = buildCalendarDays({ day: 1, month: 8, year: 2026 })
    expect(days).toHaveLength(42)
    expect(days[0]?.value).toBe("2026-07-26")
    expect(days[41]?.value).toBe("2026-09-05")
    expect(days.filter((day) => day.inCurrentMonth)).toHaveLength(31)
  })

  test("clamps end-of-month additions and date constraints", () => {
    expect(addMonthsDateOnly("2026-01-31", 1)).toBe("2026-02-28")
    expect(addMonthsDateOnly("2028-01-31", 1)).toBe("2028-02-29")
    expect(clampDateOnly("2026-08-10", "2026-08-30")).toBe("2026-08-30")
    expect(compareDateOnly("2026-09-30", "2026-08-30")).toBe(1)
  })

  test("formats stored values for people instead of exposing ISO dates", () => {
    expect(formatDateOnly("2026-08-30")).toBe("30 Aug 2026")
  })
})
