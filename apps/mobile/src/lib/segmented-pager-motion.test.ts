import { describe, expect, test } from "bun:test"
import {
  PAGER_GAP,
  pagerDragPosition,
  pagerReleaseIndex,
} from "./segmented-pager-motion"

const pageWidth = 366

describe("segmented pager swipe", () => {
  test("follows the finger between pages", () => {
    expect(
      pagerDragPosition({ count: 3, dx: -(pageWidth + PAGER_GAP) / 2, index: 1, pageWidth })
    ).toBeCloseTo(1.5)
  })

  test("rubber-bands past the edges", () => {
    const dx = (pageWidth + PAGER_GAP) / 2
    expect(pagerDragPosition({ count: 3, dx, index: 0, pageWidth })).toBeCloseTo(-0.125)
    expect(pagerDragPosition({ count: 3, dx: -dx, index: 2, pageWidth })).toBeCloseTo(2.125)
  })

  test("commits past 22% of the page and snaps back below it", () => {
    expect(pagerReleaseIndex({ count: 3, dx: -pageWidth * 0.23, index: 0, pageWidth, vx: 0 })).toBe(1)
    expect(pagerReleaseIndex({ count: 3, dx: -pageWidth * 0.2, index: 0, pageWidth, vx: 0 })).toBe(0)
    expect(pagerReleaseIndex({ count: 3, dx: pageWidth * 0.3, index: 1, pageWidth, vx: 0 })).toBe(0)
  })

  test("a flick commits even when short", () => {
    expect(pagerReleaseIndex({ count: 3, dx: -20, index: 0, pageWidth, vx: -900 })).toBe(1)
  })

  test("never leaves the page range", () => {
    expect(pagerReleaseIndex({ count: 3, dx: -pageWidth, index: 2, pageWidth, vx: 0 })).toBe(2)
    expect(pagerReleaseIndex({ count: 3, dx: pageWidth, index: 0, pageWidth, vx: 0 })).toBe(0)
  })
})

describe("segmented pager gesture lock", () => {
  test("waits inside the slop", async () => {
    const { pagerGestureDecision } = await import("./segmented-pager-motion")
    expect(pagerGestureDecision(4, 3)).toBe("wait")
  })
  test("locks horizontal only when |dx| > 1.2·|dy|", async () => {
    const { pagerGestureDecision } = await import("./segmented-pager-motion")
    expect(pagerGestureDecision(13, 10)).toBe("activate")
    expect(pagerGestureDecision(12, 10)).toBe("fail")
    expect(pagerGestureDecision(-30, 4)).toBe("activate")
  })
  test("a vertical drag (scroll or pull-to-refresh) fails the swipe", async () => {
    const { pagerGestureDecision } = await import("./segmented-pager-motion")
    expect(pagerGestureDecision(2, 14)).toBe("fail")
    expect(pagerGestureDecision(0, -40)).toBe("fail")
  })
})
