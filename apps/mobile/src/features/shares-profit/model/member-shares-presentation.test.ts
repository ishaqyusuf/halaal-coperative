import { describe, expect, test } from "bun:test"
import {
  describeOptionalShareUnits,
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
})
