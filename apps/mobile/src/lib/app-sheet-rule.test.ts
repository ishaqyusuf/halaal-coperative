import { describe, expect, test } from "bun:test"
import {
  FLOATING_SHEET_CHROME,
  resolveAppSheetPresentation,
} from "./app-sheet-rule"

const windowHeight = 874 // iPhone 17 Pro points

describe("AppSheet presentation rule", () => {
  test("forms always present full screen, even when tiny", () => {
    expect(
      resolveAppSheetPresentation({
        contentHeight: 80,
        variant: "form",
        windowHeight,
      })
    ).toBe("fullscreen")
    expect(
      resolveAppSheetPresentation({
        contentHeight: null,
        variant: "form",
        windowHeight,
      })
    ).toBe("fullscreen")
  })

  test("confirms and pickers always float", () => {
    for (const variant of ["confirm", "picker"] as const) {
      expect(
        resolveAppSheetPresentation({
          contentHeight: 2000,
          variant,
          windowHeight,
        })
      ).toBe("floating")
    }
  })

  test("read-only content waits for its measurement", () => {
    expect(
      resolveAppSheetPresentation({
        contentHeight: null,
        variant: "auto",
        windowHeight,
      })
    ).toBeNull()
  })

  test("read-only content floats while the sheet fits half the window", () => {
    const fits = windowHeight / 2 - FLOATING_SHEET_CHROME.titled
    expect(
      resolveAppSheetPresentation({
        contentHeight: fits,
        variant: "auto",
        windowHeight,
      })
    ).toBe("floating")
    expect(
      resolveAppSheetPresentation({
        contentHeight: fits + 1,
        variant: "auto",
        windowHeight,
      })
    ).toBe("fullscreen")
  })

  test("an untitled sheet has less chrome", () => {
    const fits = windowHeight / 2 - FLOATING_SHEET_CHROME.untitled
    expect(
      resolveAppSheetPresentation({
        contentHeight: fits,
        titled: false,
        variant: "auto",
        windowHeight,
      })
    ).toBe("floating")
  })

  test("once expanded it stays expanded while open", () => {
    expect(
      resolveAppSheetPresentation({
        contentHeight: 120,
        previous: "fullscreen",
        variant: "auto",
        windowHeight,
      })
    ).toBe("fullscreen")
  })

  test("a floating sheet whose content grows past half expands", () => {
    expect(
      resolveAppSheetPresentation({
        contentHeight: 600,
        previous: "floating",
        variant: "auto",
        windowHeight,
      })
    ).toBe("fullscreen")
  })

  test("an unknown window keeps the current presentation", () => {
    expect(
      resolveAppSheetPresentation({
        contentHeight: 600,
        previous: "floating",
        variant: "auto",
        windowHeight: 0,
      })
    ).toBe("floating")
  })
})
