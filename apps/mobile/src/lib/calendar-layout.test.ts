import { describe, expect, test } from "bun:test"
import {
  resolveCalendarSelectorGridLayout,
  resolveCalendarViewportLayout,
} from "./calendar-layout"

describe("mobile calendar viewport layout", () => {
  test.each([
    { height: 740, width: 360 },
    { height: 844, width: 390 },
    { height: 915, width: 412 },
  ])("balances the calendar at $width dp", ({ height, width }) => {
    const viewport = resolveCalendarViewportLayout({
      fontScale: 1,
      height,
      width,
    })
    const grid = resolveCalendarSelectorGridLayout(
      viewport.pageWidth,
      viewport.stageHeight
    )

    expect(viewport.pageWidth).toBe(width - 56)
    expect(grid.cellWidth * 3 + grid.horizontalInset * 2).toBeCloseTo(
      viewport.pageWidth,
      5
    )
    expect(grid.cellHeight * 4 + grid.verticalInset * 2).toBeCloseTo(
      viewport.stageHeight,
      5
    )
    expect(grid.optionHeight).toBeGreaterThanOrEqual(48)
  })

  test("keeps the same fixed stage at larger accessibility font scales", () => {
    const regular = resolveCalendarViewportLayout({
      fontScale: 1,
      height: 844,
      width: 390,
    })
    const accessible = resolveCalendarViewportLayout({
      fontScale: 1.3,
      height: 844,
      width: 390,
    })

    expect(accessible.pageWidth).toBe(regular.pageWidth)
    expect(accessible.sheetHeight).toBeGreaterThanOrEqual(regular.sheetHeight)
    expect(accessible.sheetHeight).toBeLessThanOrEqual(560)
    expect(accessible.stageHeight).toBe(accessible.sheetHeight - 218)
  })
})
