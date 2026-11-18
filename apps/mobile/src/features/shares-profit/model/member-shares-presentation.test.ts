import { describe, expect, test } from "bun:test"
import {
  describeOptionalShareUnits,
  formatShareDate,
  formatShareUnitCount,
} from "./member-shares-presentation"

describe("member share presentation", () => {
  test("uses correct unit grammar", () => {
    expect(formatShareUnitCount(1)).toBe("1 unit")
    expect(formatShareUnitCount(3)).toBe("3 units")
  })

  test("summarizes pending optional shares without internal workflow copy", () => {
    expect(describeOptionalShareUnits(0)).toBe("No pending requests")
    expect(describeOptionalShareUnits(2)).toBe("2 units awaiting review")
  })

  test("formats the effective calendar date consistently for share activity", () => {
    expect(formatShareDate("2026-11-04T00:00:00.000Z")).toBe("4 Nov 2026")
  })
})
