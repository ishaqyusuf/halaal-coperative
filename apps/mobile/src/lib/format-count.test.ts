import { describe, expect, test } from "bun:test"
import { formatCount } from "./format-count"

describe("formatCount", () => {
  test("uses the singular label only for one", () => {
    expect(formatCount(1, "month")).toBe("1 month")
    expect(formatCount(0, "month")).toBe("0 months")
    expect(formatCount(3, "month")).toBe("3 months")
  })

  test("supports an explicit irregular plural", () => {
    expect(formatCount(2, "policy", "policies")).toBe("2 policies")
  })
})
