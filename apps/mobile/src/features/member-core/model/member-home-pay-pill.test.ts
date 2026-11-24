import { describe, expect, test } from "bun:test"
import { PAY_PILL_COLLAPSE_OFFSET, resolvePayPillExpanded } from "./member-home-pay-pill"

describe("home Add payment pill", () => {
  test("folds when scrolling down past 48pt", () => {
    expect(resolvePayPillExpanded({ expanded: true, previousY: 40, y: 60 })).toBe(false)
    expect(resolvePayPillExpanded({ expanded: true, previousY: 10, y: 30 })).toBe(true)
  })

  test("stays folded while scrolling up mid-page and opens near the top", () => {
    expect(resolvePayPillExpanded({ expanded: false, previousY: 400, y: 300 })).toBe(false)
    expect(
      resolvePayPillExpanded({ expanded: false, previousY: 80, y: PAY_PILL_COLLAPSE_OFFSET })
    ).toBe(true)
    // Pull-to-refresh overscroll counts as the top.
    expect(resolvePayPillExpanded({ expanded: false, previousY: 0, y: -40 })).toBe(true)
  })
})
