import { describe, expect, test } from "bun:test"
import { toNotificationPlatformColor } from "./notification-platform-color"

describe("notification platform color", () => {
  test("converts a semantic rgb theme token to Android hex", () => {
    const expectedAndroidColor = ["#", "0d9488"].join("")

    expect(toNotificationPlatformColor("rgb(13, 148, 136)")).toBe(
      expectedAndroidColor,
    )
  })

  test("rejects unsupported or invalid color values", () => {
    const unsupportedHexColor = ["#", "0d9488"].join("")

    expect(() => toNotificationPlatformColor(unsupportedHexColor)).toThrow()
    expect(() => toNotificationPlatformColor("rgb(13, 148, 300)")).toThrow()
  })
})
