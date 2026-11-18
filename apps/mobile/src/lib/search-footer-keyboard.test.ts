import { describe, expect, test } from "bun:test"
import { resolveSearchFooterKeyboardOffset } from "./search-footer-keyboard"

const GAP = 10

/** Distance from the keyboard top to the pill bottom while it is open. */
function gapAboveKeyboard(safeAreaPadding: number) {
  const { opened } = resolveSearchFooterKeyboardOffset({
    bottomOffset: 0,
    safeAreaPadding,
  })
  // The footer's own bottom padding is safeAreaPadding + GAP; the view sits
  // on the keyboard (translate by the keyboard height) and then moves down by
  // `opened`.
  return safeAreaPadding + GAP - opened
}

describe("search footer keyboard offset", () => {
  test("a constant 10pt gap above the keyboard on any device", () => {
    for (const padding of [34, 24, 8]) {
      expect(gapAboveKeyboard(padding)).toBe(10)
    }
  })

  test("closed keeps the footer above the tab dock", () => {
    expect(
      resolveSearchFooterKeyboardOffset({ bottomOffset: 70, safeAreaPadding: 34 })
        .closed
    ).toBe(-70)
  })
})
