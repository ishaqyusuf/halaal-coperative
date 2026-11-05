import { describe, expect, test } from "bun:test"

import { resolveVirtualizedListHeight } from "./virtualized-list-height"

describe("resolveVirtualizedListHeight", () => {
  test("uses the estimate before the content is measured", () => {
    expect(
      resolveVirtualizedListHeight({
        contentHeight: null,
        estimatedItemSize: 104,
        itemCount: 2,
        maxHeight: 560,
      })
    ).toBe(208)
  })

  test("grows to fit a first row taller than the estimate", () => {
    expect(
      resolveVirtualizedListHeight({
        contentHeight: 168,
        estimatedItemSize: 104,
        itemCount: 1,
        maxHeight: 560,
      })
    ).toBe(168)
  })

  test("shrinks when rows are shorter than the estimate", () => {
    expect(
      resolveVirtualizedListHeight({
        contentHeight: 120,
        estimatedItemSize: 84,
        itemCount: 2,
        maxHeight: 330,
      })
    ).toBe(120)
  })

  test("never exceeds the cap, so long lists still scroll", () => {
    expect(
      resolveVirtualizedListHeight({
        contentHeight: 2400,
        estimatedItemSize: 84,
        itemCount: 30,
        maxHeight: 330,
      })
    ).toBe(330)
  })

  test("ignores an empty measurement", () => {
    expect(
      resolveVirtualizedListHeight({
        contentHeight: 0,
        estimatedItemSize: 84,
        itemCount: 1,
        maxHeight: 330,
      })
    ).toBe(84)
  })
})
