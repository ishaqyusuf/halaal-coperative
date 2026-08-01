import { describe, expect, test } from "bun:test"
import {
  getNextHeaderHiddenState,
  shouldPreserveHeaderDuringLayoutClamp,
} from "./use-scroll-header"

describe("getNextHeaderHiddenState", () => {
  test("hides while scrolling down and reveals while scrolling up", () => {
    expect(
      getNextHeaderHiddenState({
        currentlyHidden: false,
        currentScrollTop: 120,
        previousScrollTop: 40,
        revealOnScrollUp: true,
      })
    ).toBe(true)

    expect(
      getNextHeaderHiddenState({
        currentlyHidden: true,
        currentScrollTop: 80,
        previousScrollTop: 120,
        revealOnScrollUp: true,
      })
    ).toBe(false)
  })

  test("always reveals at the top and preserves state without movement", () => {
    expect(
      getNextHeaderHiddenState({
        currentlyHidden: true,
        currentScrollTop: 0,
        previousScrollTop: 20,
        revealOnScrollUp: true,
      })
    ).toBe(false)

    expect(
      getNextHeaderHiddenState({
        currentlyHidden: true,
        currentScrollTop: 80,
        previousScrollTop: 80,
        revealOnScrollUp: true,
      })
    ).toBe(true)
  })

  test("keeps the original position-based behavior by default", () => {
    expect(
      getNextHeaderHiddenState({
        currentlyHidden: true,
        currentScrollTop: 80,
        previousScrollTop: 120,
        revealOnScrollUp: false,
      })
    ).toBe(true)
  })
})

describe("shouldPreserveHeaderDuringLayoutClamp", () => {
  test("preserves a hidden header when the expanded list remains scrollable", () => {
    expect(
      shouldPreserveHeaderDuringLayoutClamp({
        clientHeight: 600,
        currentScrollTop: 80,
        currentlyHidden: true,
        guardActive: true,
        previousScrollTop: 120,
        revealOnScrollUp: true,
        scrollHeight: 1200,
      })
    ).toBe(true)
  })

  test("reveals when expansion removes the remaining scroll range", () => {
    expect(
      shouldPreserveHeaderDuringLayoutClamp({
        clientHeight: 650,
        currentScrollTop: 0,
        currentlyHidden: true,
        guardActive: true,
        previousScrollTop: 39,
        revealOnScrollUp: true,
        scrollHeight: 591,
      })
    ).toBe(false)
  })
})
