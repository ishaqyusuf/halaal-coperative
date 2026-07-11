import { describe, expect, test } from "bun:test"
import { calculateOpeningShareCapitalFromUnits } from "./member-opening-position"

describe("member opening position", () => {
  test("calculates unit-based share capital", () => {
    expect(
      calculateOpeningShareCapitalFromUnits({
        shareUnits: 3,
        unitAmount: 10000,
      })
    ).toBe(30000)
  })

  test("returns zero for invalid unit inputs", () => {
    expect(
      calculateOpeningShareCapitalFromUnits({
        shareUnits: Number.NaN,
        unitAmount: 10000,
      })
    ).toBe(0)
    expect(
      calculateOpeningShareCapitalFromUnits({
        shareUnits: 3,
        unitAmount: -1,
      })
    ).toBe(0)
  })
})
