import { describe, expect, test } from "bun:test"
import { stackTransition, tabTransition } from "./screen-transition"

describe("screen transition", () => {
  test("tabs shift, or switch without motion under Reduce Motion", () => {
    expect(tabTransition(false)).toEqual({ animation: "shift" })
    expect(tabTransition(true)).toEqual({ animation: "none" })
  })

  test("pushed screens slide from the right on every platform", () => {
    expect(stackTransition("statement", false)).toEqual({
      animation: "slide_from_right",
      gestureEnabled: true,
    })
    expect(stackTransition("(tabs)", false).animation).toBe("slide_from_right")
  })

  test("the assistant and the member account menu rise from the bottom", () => {
    expect(stackTransition("ask-assistant", false).animation).toBe(
      "slide_from_bottom"
    )
    expect(stackTransition("more", false).animation).toBe("slide_from_bottom")
    expect(stackTransition("financing", false).animation).toBe("slide_from_right")
  })

  test("Reduce Motion fades every stack move and keeps swipe back", () => {
    expect(stackTransition("ask-assistant", true)).toEqual({
      animation: "fade",
      gestureEnabled: true,
    })
    expect(stackTransition("statement", true).animation).toBe("fade")
  })
})
